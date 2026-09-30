import { eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  companies,
  entities,
  entityPages,
  people,
  positions,
  searchColumns,
  searchResults,
  searches,
  webPages,
} from '@/db/schema'
import type {
  SearchCategory,
  SearchEntity,
  SearchEvent,
  SearchMode,
} from '@/lib/search'
import { normalizeUrl } from '@/lib/url'
import { searchExa } from '@/server/exa'
import { runAgentSearch } from '@/server/agent-search'
import type { AgentEffort } from '@/lib/agent'
import { attachValues, loadEntityRows } from '@/server/result-rows'
import type { ResultRow } from '@/server/result-rows'
import {
  buildSummarySchema,
  resolveColumns,
  storeFieldValues,
} from '@/server/columns'
import type { ColumnDef } from '@/lib/columns'
import type { ExaEntity, ExaResult, WebSearchMode } from '@/server/exa'
import {
  describePerson,
  mapCompany,
  mapPerson,
  mapPositions,
} from '@/server/exa-mappers'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

interface SearchInput {
  query: string
  category?: SearchCategory
  limit: number
  mode: SearchMode
  effort: AgentEffort
  columns: Array<string>
  email: string
}

function pageRow(page: typeof webPages.$inferSelect): SearchEntity {
  return {
    id: page.id,
    name: page.title ?? page.url,
    url: page.url,
    type: 'page',
    role: page.author,
    location: null,
    highlight: page.highlights.at(0) ?? null,
    values: {},
    evidence: {},
  }
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

async function storeExaResults(
  results: Array<ExaResult>,
  columnDefs: Array<ColumnDef>,
  searchId: string,
): Promise<Array<ResultRow>> {
  const stored = await db.transaction(async (tx) => {
    const rows: Array<{
      entityId: string | null
      page: typeof webPages.$inferSelect
    }> = []
    for (const result of results) {
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
      await storeFieldValues(tx, columnDefs, result.extracted, {
        entityId,
        pageId: page.id,
        searchId,
        pageText: result.text,
      })
      rows.push({ entityId, page })
    }
    return rows
  })

  const entityRows = await loadEntityRows(
    stored.flatMap((row) => (row.entityId ? [row.entityId] : [])),
  )

  return attachValues(
    stored.flatMap(({ entityId, page }): Array<ResultRow> => {
      const entity = entityId ? entityRows.get(entityId) : pageRow(page)
      return entity ? [{ entity, entityId, pageId: page.id }] : []
    }),
    columnDefs,
    searchId,
  )
}

export async function* runSearch(
  input: SearchInput,
): AsyncGenerator<SearchEvent> {
  if (input.mode === 'agent') {
    yield* runAgentSearch(input)
    return
  }
  yield* runWebSearch({ ...input, mode: input.mode })
}

async function* runWebSearch({
  query,
  category,
  limit,
  mode,
  columns: columnIds,
  email,
}: SearchInput & { mode: WebSearchMode }): AsyncGenerator<SearchEvent> {
  const search = (
    await db
      .insert(searches)
      .values({
        query,
        category: category ?? null,
        resultLimit: limit,
        mode,
        createdByEmail: email,
      })
      .returning({ id: searches.id })
  ).at(0)

  if (!search) throw new Error('Failed to record search')

  const columnDefs = await resolveColumns(columnIds, category)
  if (columnDefs.length > 0) {
    await db.insert(searchColumns).values(
      columnDefs.map((column, index) => ({
        searchId: search.id,
        columnId: column.id,
        position: index,
      })),
    )
  }
  yield { type: 'columns', columns: columnDefs }

  const seen = new Map<string, ResultRow>()

  try {
    const results = await searchExa({
      query,
      category,
      numResults: limit,
      mode,
      summary:
        columnDefs.length > 0 ? buildSummarySchema(columnDefs) : undefined,
    })
    for (const row of await storeExaResults(results, columnDefs, search.id)) {
      if (seen.has(row.entity.id)) continue
      seen.set(row.entity.id, row)
      yield { type: 'entity', entity: row.entity }
    }
  } catch (error) {
    console.error('Exa search failed', error)
    yield { type: 'error', message: 'Search failed. Please try again.' }
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
          })),
        )
        .onConflictDoNothing()
    }
  }

  yield { type: 'done', searchId: search.id, count: seen.size }
}
