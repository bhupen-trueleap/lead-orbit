import { and, eq, ilike, inArray, isNull, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  entities,
  entityAttributes,
  searchResults,
  searches,
} from '@/db/schema'
import type {
  SearchCategory,
  SearchEntity,
  SearchEvent,
  SearchLimit,
} from '@/lib/search'
import { searchExa } from '@/server/exa'
import type { ExaResult } from '@/server/exa'

const HIGHLIGHT_MAX_LENGTH = 500

interface SearchInput {
  query: string
  category?: SearchCategory
  limit: SearchLimit
  email: string
}

function entityTypeFor(category: SearchCategory | undefined): string {
  if (category === 'people') return 'person'
  if (category === 'company') return 'company'
  return 'other'
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

async function findStoredEntities(
  query: string,
  category: SearchCategory | undefined,
  limit: SearchLimit,
) {
  const typeFilter = category
    ? eq(entities.type, entityTypeFor(category))
    : undefined

  const previous = await db
    .select({ entity: entities })
    .from(searchResults)
    .innerJoin(searches, eq(searches.id, searchResults.searchId))
    .innerJoin(entities, eq(entities.id, searchResults.entityId))
    .where(
      and(
        sql`lower(${searches.query}) = ${query.toLowerCase()}`,
        category ? eq(searches.category, category) : isNull(searches.category),
        typeFilter,
      ),
    )
    .limit(limit)

  const byName = await db
    .select()
    .from(entities)
    .where(and(ilike(entities.name, `%${escapeLike(query)}%`), typeFilter))
    .limit(limit)

  const unique = new Map<string, typeof entities.$inferSelect>()
  for (const { entity } of previous) unique.set(entity.id, entity)
  for (const entity of byName) unique.set(entity.id, entity)
  return [...unique.values()].slice(0, limit)
}

async function loadHighlights(
  entityIds: Array<string>,
): Promise<Map<string, string>> {
  if (entityIds.length === 0) return new Map()
  const rows = await db
    .select({
      entityId: entityAttributes.entityId,
      value: entityAttributes.value,
    })
    .from(entityAttributes)
    .where(
      and(
        inArray(entityAttributes.entityId, entityIds),
        eq(entityAttributes.key, 'highlight'),
      ),
    )
  return new Map(rows.map((row) => [row.entityId, row.value]))
}

async function storeExaResults(
  results: Array<ExaResult>,
  category: SearchCategory | undefined,
): Promise<Array<SearchEntity>> {
  const byUrl = new Map(results.map((result) => [result.url, result]))
  if (byUrl.size === 0) return []

  const stored = await db
    .insert(entities)
    .values(
      [...byUrl.values()].map((result) => ({
        type: entityTypeFor(category),
        name: result.title,
        url: result.url,
      })),
    )
    .onConflictDoUpdate({
      target: entities.url,
      set: {
        name: sql`excluded.name`,
        type: sql`case when ${entities.type} = 'other' then excluded.type else ${entities.type} end`,
        updatedAt: sql`now()`,
      },
    })
    .returning()

  const attributeRows = stored.flatMap((entity) => {
    const highlight = entity.url
      ? byUrl.get(entity.url)?.highlights[0]?.slice(0, HIGHLIGHT_MAX_LENGTH)
      : undefined
    return highlight
      ? [{ entityId: entity.id, key: 'highlight', value: highlight }]
      : []
  })

  if (attributeRows.length > 0) {
    await db
      .insert(entityAttributes)
      .values(attributeRows)
      .onConflictDoUpdate({
        target: [entityAttributes.entityId, entityAttributes.key],
        set: { value: sql`excluded.value` },
      })
  }

  const highlights = new Map(
    attributeRows.map((row) => [row.entityId, row.value]),
  )
  return stored.map((entity) => ({
    id: entity.id,
    name: entity.name,
    url: entity.url,
    type: entity.type,
    highlight: highlights.get(entity.id) ?? null,
    source: 'exa',
  }))
}

export async function* runSearch({
  query,
  category,
  limit,
  email,
}: SearchInput): AsyncGenerator<SearchEvent> {
  const search = (
    await db
      .insert(searches)
      .values({ query, category: category ?? null, createdByEmail: email })
      .returning({ id: searches.id })
  ).at(0)

  if (!search) throw new Error('Failed to record search')

  const seen = new Set<string>()

  try {
    const stored = await findStoredEntities(query, category, limit)
    const highlights = await loadHighlights(stored.map((entity) => entity.id))
    for (const entity of stored) {
      seen.add(entity.id)
      yield {
        type: 'entity',
        entity: {
          id: entity.id,
          name: entity.name,
          url: entity.url,
          type: entity.type,
          highlight: highlights.get(entity.id) ?? null,
          source: 'database',
        },
      }
    }

    if (stored.length < limit) {
      try {
        const results = await searchExa({
          query,
          category,
          numResults: limit,
        })
        for (const entity of await storeExaResults(results, category)) {
          if (seen.has(entity.id)) continue
          seen.add(entity.id)
          yield { type: 'entity', entity }
        }
      } catch (error) {
        console.error('Exa search failed', error)
        yield {
          type: 'error',
          message: 'Fresh web discovery failed. Showing stored results only.',
        }
      }
    }
  } finally {
    if (seen.size > 0) {
      await db
        .insert(searchResults)
        .values(
          [...seen].map((entityId) => ({ searchId: search.id, entityId })),
        )
        .onConflictDoNothing()
    }
  }

  yield { type: 'done', searchId: search.id, count: seen.size }
}
