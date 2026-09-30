import { and, asc, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  agentRuns,
  entities,
  searchColumns,
  searchResults,
  searches,
} from '@/db/schema'
import { isFinalStatus } from '@/lib/agent'
import type { AgentEffort, AgentRunStatus } from '@/lib/agent'
import type { SearchCategory } from '@/lib/categories'
import type { ColumnDef } from '@/lib/columns'
import { isSearchCategory } from '@/lib/search'
import type { SearchEvent } from '@/lib/search'
import { normalizeUrl } from '@/lib/url'
import { buildAgentRequest, createAgentRun, getAgentRun } from '@/server/agent'
import type { AgentItem, AgentRunSnapshot } from '@/server/agent'
import { resolveColumns, storeFieldValues } from '@/server/columns'
import { attachValues, loadEntityRows } from '@/server/result-rows'

const POLL_INTERVAL_MS = 3_000
const MAX_WAIT_MS = 15 * 60 * 1_000

interface AgentSearchInput {
  query: string
  category?: SearchCategory
  limit: number
  effort: AgentEffort
  columns: Array<string>
  email: string
}

function entityTypeFor(category: SearchCategory | undefined): string {
  if (category === 'people') return 'person'
  if (category === 'company') return 'company'
  return 'other'
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

async function upsertItemEntity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  item: AgentItem,
  url: string,
  type: string,
): Promise<string | null> {
  const existing = (
    await tx
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.url, url))
      .limit(1)
  ).at(0)
  if (existing) {
    await tx
      .update(entities)
      .set({ updatedAt: sql`now()` })
      .where(eq(entities.id, existing.id))
    return existing.id
  }
  const inserted = (
    await tx
      .insert(entities)
      .values({ type, name: item.name, url })
      .returning({ id: entities.id })
  ).at(0)
  return inserted?.id ?? null
}

async function storeAgentItems(
  snapshot: AgentRunSnapshot,
  columnDefs: Array<ColumnDef>,
  searchId: string,
  category: SearchCategory | undefined,
) {
  const entityIds = await db.transaction(async (tx) => {
    const ids: Array<string> = []
    for (const item of snapshot.items) {
      const url = item.url ? normalizeUrl(item.url) : null
      if (!url) continue
      const entityId = await upsertItemEntity(
        tx,
        item,
        url,
        entityTypeFor(category),
      )
      if (!entityId || ids.includes(entityId)) continue
      await storeFieldValues(tx, columnDefs, item.fields, {
        entityId,
        pageId: null,
        searchId,
        pageText: null,
        evidence: item.evidence,
      })
      ids.push(entityId)
    }
    if (ids.length > 0) {
      await tx
        .insert(searchResults)
        .values(
          ids.map((entityId, index) => ({
            searchId,
            entityId,
            rank: index + 1,
          })),
        )
        .onConflictDoNothing()
    }
    return ids
  })
  return loadStoredRows(entityIds, columnDefs, searchId)
}

async function loadStoredRows(
  entityIds: Array<string>,
  columnDefs: Array<ColumnDef>,
  searchId: string,
) {
  const byId = await loadEntityRows(entityIds)
  const rows = entityIds.flatMap((entityId) => {
    const entity = byId.get(entityId)
    return entity ? [{ entity, entityId, pageId: null }] : []
  })
  return attachValues(rows, columnDefs, searchId)
}

async function updateRun(
  searchId: string,
  snapshot: AgentRunSnapshot,
): Promise<void> {
  await db
    .update(agentRuns)
    .set({
      status: snapshot.status,
      stopReason: snapshot.stopReason,
      costDollars: snapshot.costDollars,
      usage: snapshot.usage,
      completedAt: isFinalStatus(snapshot.status) ? sql`now()` : null,
    })
    .where(eq(agentRuns.searchId, searchId))
}

async function* followRun(
  searchId: string,
  exaRunId: string,
  initialStatus: AgentRunStatus,
  columnDefs: Array<ColumnDef>,
  category: SearchCategory | undefined,
): AsyncGenerator<SearchEvent> {
  let status = initialStatus
  const startedAt = Date.now()

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    await sleep(POLL_INTERVAL_MS)
    const snapshot = await getAgentRun(exaRunId)
    if (snapshot.status !== status) {
      status = snapshot.status
      if (!isFinalStatus(status)) {
        await updateRun(searchId, snapshot)
        yield { type: 'status', status, searchId }
      }
    }
    if (snapshot.status === 'completed') {
      const rows = await storeAgentItems(
        snapshot,
        columnDefs,
        searchId,
        category,
      )
      await updateRun(searchId, snapshot)
      yield { type: 'status', status: 'completed', searchId }
      for (const row of rows) yield { type: 'entity', entity: row.entity }
      return
    }
    if (isFinalStatus(snapshot.status)) {
      await updateRun(searchId, snapshot)
      yield { type: 'status', status: snapshot.status, searchId }
      yield { type: 'error', message: 'The agent run did not finish.' }
      return
    }
  }

  yield {
    type: 'error',
    message:
      'The agent is still working. Open this search again from Recent searches to see the results.',
  }
}

export async function* runAgentSearch({
  query,
  category,
  limit,
  effort,
  columns: columnIds,
  email,
}: AgentSearchInput): AsyncGenerator<SearchEvent> {
  const search = (
    await db
      .insert(searches)
      .values({
        query,
        category: category ?? null,
        resultLimit: limit,
        mode: 'agent',
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

  let count = 0
  try {
    const run = await createAgentRun(
      buildAgentRequest(query, category, limit, effort, columnDefs),
    )
    await db.insert(agentRuns).values({
      searchId: search.id,
      exaRunId: run.id,
      effort,
      status: run.status,
    })
    yield { type: 'status', status: run.status, searchId: search.id }
    for await (const event of followRun(
      search.id,
      run.id,
      run.status,
      columnDefs,
      category,
    )) {
      if (event.type === 'entity') count += 1
      yield event
    }
  } catch (error) {
    console.error('Agent search failed', error)
    yield {
      type: 'error',
      message: 'The agent search failed. Please try again.',
    }
  }

  yield { type: 'done', searchId: search.id, count }
}

export async function* resumeAgentSearch(
  searchId: string,
  email: string,
): AsyncGenerator<SearchEvent> {
  const found = (
    await db
      .select({ search: searches, run: agentRuns })
      .from(searches)
      .innerJoin(agentRuns, eq(agentRuns.searchId, searches.id))
      .where(and(eq(searches.id, searchId), eq(searches.createdByEmail, email)))
      .limit(1)
  ).at(0)

  if (!found) {
    yield { type: 'error', message: 'This agent search was not found.' }
    return
  }

  const { search, run } = found
  const category = isSearchCategory(search.category)
    ? search.category
    : undefined
  const columnIds = (
    await db
      .select({ columnId: searchColumns.columnId })
      .from(searchColumns)
      .where(eq(searchColumns.searchId, searchId))
      .orderBy(asc(searchColumns.position))
  ).map((row) => row.columnId)
  const columnDefs = await resolveColumns(columnIds, category)
  yield { type: 'columns', columns: columnDefs }

  let count = 0
  try {
    if (run.status === 'completed') {
      const ids = (
        await db
          .select({ entityId: searchResults.entityId })
          .from(searchResults)
          .where(eq(searchResults.searchId, searchId))
          .orderBy(asc(searchResults.rank))
      ).flatMap((row) => (row.entityId ? [row.entityId] : []))
      yield { type: 'status', status: 'completed', searchId }
      for (const row of await loadStoredRows(ids, columnDefs, searchId)) {
        count += 1
        yield { type: 'entity', entity: row.entity }
      }
    } else if (run.status === 'failed' || run.status === 'cancelled') {
      yield { type: 'status', status: run.status, searchId }
      yield { type: 'error', message: 'The agent run did not finish.' }
    } else {
      yield { type: 'status', status: 'running', searchId }
      for await (const event of followRun(
        searchId,
        run.exaRunId,
        'running',
        columnDefs,
        category,
      )) {
        if (event.type === 'entity') count += 1
        yield event
      }
    }
  } catch (error) {
    console.error('Agent resume failed', error)
    yield { type: 'error', message: 'Could not load the agent results.' }
  }

  yield { type: 'done', searchId, count }
}
