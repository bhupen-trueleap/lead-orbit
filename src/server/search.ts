import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  companies,
  entities,
  entityPages,
  exaRequests,
  people,
  positions,
  searchResults,
  searches,
  webPages,
} from '@/db/schema'
import type {
  SearchCategory,
  SearchEntity,
  SearchEvent,
  SearchLimit,
  SearchSource,
} from '@/lib/search'
import { normalizeUrl } from '@/lib/url'
import { searchExa } from '@/server/exa'
import type { ExaEntity, ExaResult, ExaSearchResponse } from '@/server/exa'
import {
  describePerson,
  mapCompany,
  mapPerson,
  mapPositions,
} from '@/server/exa-mappers'
import { entityRowFields, toSearchEntity } from '@/server/entity-rows'
import type { EntityRow } from '@/server/entity-rows'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

interface SearchInput {
  query: string
  category?: SearchCategory
  limit: SearchLimit
  email: string
}

interface ResultRow {
  entity: SearchEntity
  entityId: string | null
  pageId: string | null
}

function entityTypeFor(category: SearchCategory | undefined): string | null {
  if (category === 'people') return 'person'
  if (category === 'company') return 'company'
  return null
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

async function loadEntityRows(
  ids: Array<string>,
  source: SearchSource,
): Promise<Map<string, SearchEntity>> {
  if (ids.length === 0) return new Map()
  const rows: Array<EntityRow> = await db
    .select(entityRowFields)
    .from(entities)
    .leftJoin(people, eq(people.entityId, entities.id))
    .leftJoin(companies, eq(companies.entityId, entities.id))
    .where(inArray(entities.id, ids))
  return new Map(rows.map((row) => [row.id, toSearchEntity(row, source)]))
}

function pageRow(
  page: typeof webPages.$inferSelect,
  source: SearchSource,
): SearchEntity {
  return {
    id: page.id,
    name: page.title ?? page.url,
    url: page.url,
    type: 'page',
    role: page.author,
    location: null,
    highlight: page.highlights.at(0) ?? null,
    source,
  }
}

async function findStoredResults(
  query: string,
  category: SearchCategory | undefined,
  limit: SearchLimit,
): Promise<Array<ResultRow>> {
  const type = entityTypeFor(category)

  const previous = await db
    .select({
      entityId: searchResults.entityId,
      pageId: searchResults.pageId,
    })
    .from(searchResults)
    .innerJoin(searches, eq(searches.id, searchResults.searchId))
    .leftJoin(entities, eq(entities.id, searchResults.entityId))
    .where(
      and(
        sql`lower(${searches.query}) = ${query.toLowerCase()}`,
        category ? eq(searches.category, category) : isNull(searches.category),
        type ? eq(entities.type, type) : undefined,
      ),
    )
    .orderBy(sql`${searches.createdAt} desc`, asc(searchResults.rank))
    .limit(limit * 4)

  const byName = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        ilike(entities.name, `%${escapeLike(query)}%`),
        type ? eq(entities.type, type) : undefined,
      ),
    )
    .limit(limit)

  const entityIds = [
    ...new Set([
      ...previous.flatMap((row) => (row.entityId ? [row.entityId] : [])),
      ...byName.map((row) => row.id),
    ]),
  ]
  const pageIds = [
    ...new Set(
      previous.flatMap((row) =>
        !row.entityId && row.pageId ? [row.pageId] : [],
      ),
    ),
  ]

  const entityRows = await loadEntityRows(entityIds, 'database')
  const pages =
    pageIds.length > 0
      ? await db.select().from(webPages).where(inArray(webPages.id, pageIds))
      : []

  const results: Array<ResultRow> = []
  for (const id of entityIds) {
    const entity = entityRows.get(id)
    if (entity) results.push({ entity, entityId: id, pageId: null })
  }
  for (const page of pages) {
    results.push({
      entity: pageRow(page, 'database'),
      entityId: null,
      pageId: page.id,
    })
  }
  return results.slice(0, limit)
}

async function upsertPage(
  tx: Transaction,
  result: ExaResult,
  url: string,
): Promise<typeof webPages.$inferSelect> {
  const publishedDate = result.publishedDate
    ? new Date(result.publishedDate)
    : null
  const values = {
    url,
    exaId: result.id,
    title: result.title,
    author: result.author,
    publishedDate:
      publishedDate && !Number.isNaN(publishedDate.getTime())
        ? publishedDate
        : null,
    image: result.image,
    favicon: result.favicon,
    text: result.text,
    highlights: result.highlights,
  }
  const page = (
    await tx
      .insert(webPages)
      .values(values)
      .onConflictDoUpdate({
        target: webPages.url,
        set: {
          exaId: values.exaId,
          title: values.title ?? sql`${webPages.title}`,
          author: values.author ?? sql`${webPages.author}`,
          publishedDate: values.publishedDate ?? sql`${webPages.publishedDate}`,
          image: values.image ?? sql`${webPages.image}`,
          favicon: values.favicon ?? sql`${webPages.favicon}`,
          text: values.text ?? sql`${webPages.text}`,
          highlights:
            values.highlights.length > 0
              ? values.highlights
              : sql`${webPages.highlights}`,
          fetchedAt: sql`now()`,
        },
      })
      .returning()
  ).at(0)
  if (!page) throw new Error('Failed to store page')
  return page
}

async function upsertEntity(
  tx: Transaction,
  exaEntity: ExaEntity,
  result: ExaResult,
  url: string,
): Promise<string> {
  const workHistory =
    exaEntity.type === 'person' ? mapPositions(exaEntity.properties) : []
  const person =
    exaEntity.type === 'person'
      ? mapPerson(exaEntity.properties, workHistory)
      : null
  const company =
    exaEntity.type === 'company' ? mapCompany(exaEntity.properties) : null

  const nameValue = exaEntity.properties.name
  const name =
    (typeof nameValue === 'string' && nameValue.trim()) || result.title || url
  const descriptionValue = exaEntity.properties.description
  const description =
    typeof descriptionValue === 'string' && descriptionValue.trim() !== ''
      ? descriptionValue
      : person
        ? describePerson(person)
        : null

  const existing = await tx
    .select({ id: entities.id })
    .from(entities)
    .where(or(eq(entities.exaEntityId, exaEntity.id), eq(entities.url, url)))
    .limit(1)

  let entityId = existing.at(0)?.id
  if (entityId) {
    await tx
      .update(entities)
      .set({
        type: exaEntity.type,
        name,
        exaEntityId: exaEntity.id,
        description: description ?? sql`${entities.description}`,
        properties: exaEntity.properties,
        version: exaEntity.version,
        updatedAt: sql`now()`,
      })
      .where(eq(entities.id, entityId))
  } else {
    const inserted = (
      await tx
        .insert(entities)
        .values({
          type: exaEntity.type,
          name,
          url,
          exaEntityId: exaEntity.id,
          description,
          properties: exaEntity.properties,
          version: exaEntity.version,
        })
        .returning({ id: entities.id })
    ).at(0)
    entityId = inserted?.id
  }
  if (!entityId) throw new Error('Failed to store entity')

  if (person) {
    await tx
      .insert(people)
      .values({ entityId, ...person })
      .onConflictDoUpdate({
        target: people.entityId,
        set: {
          firstName: person.firstName ?? sql`${people.firstName}`,
          lastName: person.lastName ?? sql`${people.lastName}`,
          location: person.location ?? sql`${people.location}`,
          currentTitle: person.currentTitle ?? sql`${people.currentTitle}`,
          currentCompanyName:
            person.currentCompanyName ?? sql`${people.currentCompanyName}`,
          currentCompanyExaId:
            person.currentCompanyExaId ?? sql`${people.currentCompanyExaId}`,
          seniority: person.seniority ?? sql`${people.seniority}`,
        },
      })
    if (workHistory.length > 0) {
      await tx.delete(positions).where(eq(positions.personId, entityId))
      await tx
        .insert(positions)
        .values(
          workHistory.map((position) => ({ personId: entityId, ...position })),
        )
    }
  }

  if (company) {
    await tx
      .insert(companies)
      .values({ entityId, ...company })
      .onConflictDoUpdate({
        target: companies.entityId,
        set: {
          foundedYear: company.foundedYear ?? sql`${companies.foundedYear}`,
          headcount: company.headcount ?? sql`${companies.headcount}`,
          hqAddress: company.hqAddress ?? sql`${companies.hqAddress}`,
          hqCity: company.hqCity ?? sql`${companies.hqCity}`,
          hqCountry: company.hqCountry ?? sql`${companies.hqCountry}`,
          revenueAnnual:
            company.revenueAnnual ?? sql`${companies.revenueAnnual}`,
          fundingTotal: company.fundingTotal ?? sql`${companies.fundingTotal}`,
          latestRoundName:
            company.latestRoundName ?? sql`${companies.latestRoundName}`,
          latestRoundDate:
            company.latestRoundDate ?? sql`${companies.latestRoundDate}`,
          latestRoundAmount:
            company.latestRoundAmount ?? sql`${companies.latestRoundAmount}`,
          monthlyVisits:
            company.monthlyVisits ?? sql`${companies.monthlyVisits}`,
        },
      })
  }

  return entityId
}

async function storeExaResponse(
  searchId: string,
  response: ExaSearchResponse,
): Promise<Array<ResultRow>> {
  const stored = await db.transaction(async (tx) => {
    await tx.insert(exaRequests).values({
      searchId,
      exaRequestId: response.requestId,
      request: response.request,
      resolvedSearchType: response.resolvedSearchType,
      costDollars: response.costDollars,
      searchTimeMs: response.searchTimeMs,
      resultCount: response.results.length,
    })

    const rows: Array<{
      entityId: string | null
      page: typeof webPages.$inferSelect
    }> = []
    for (const result of response.results) {
      const url = normalizeUrl(result.url)
      if (!url) continue
      const page = await upsertPage(tx, result, url)
      const exaEntity = result.entities.at(0)
      let entityId: string | null = null
      if (exaEntity) {
        entityId = await upsertEntity(tx, exaEntity, result, url)
        await tx
          .insert(entityPages)
          .values({ entityId, pageId: page.id })
          .onConflictDoNothing()
      }
      rows.push({ entityId, page })
    }
    return rows
  })

  const entityRows = await loadEntityRows(
    stored.flatMap((row) => (row.entityId ? [row.entityId] : [])),
    'exa',
  )

  return stored.flatMap(({ entityId, page }) => {
    const entity = entityId ? entityRows.get(entityId) : pageRow(page, 'exa')
    return entity ? [{ entity, entityId, pageId: page.id }] : []
  })
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

  const seen = new Map<string, ResultRow>()

  try {
    const stored = await findStoredResults(query, category, limit)
    for (const row of stored) {
      seen.set(row.entity.id, row)
      yield { type: 'entity', entity: row.entity }
    }

    if (stored.length < limit) {
      try {
        const response = await searchExa({ query, category, numResults: limit })
        for (const row of await storeExaResponse(search.id, response)) {
          if (seen.has(row.entity.id)) continue
          seen.set(row.entity.id, row)
          yield { type: 'entity', entity: row.entity }
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
    const rows = [...seen.values()]
    if (rows.length > 0) {
      await db
        .insert(searchResults)
        .values(
          rows.map((row, index) => ({
            searchId: search.id,
            entityId: row.entityId,
            pageId: row.pageId,
            rank: index + 1,
            source: row.entity.source,
          })),
        )
        .onConflictDoNothing()
    }
  }

  yield { type: 'done', searchId: search.id, count: seen.size }
}
