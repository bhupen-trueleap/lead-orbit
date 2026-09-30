import { count, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { agentRuns, searchResults, searches } from '@/db/schema'
import { isAgentRunStatus } from '@/lib/agent'
import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_MODE,
  isSearchCategory,
  isSearchMode,
  isSearchLimit,
} from '@/lib/search'
import type { RecentSearch } from '@/lib/recent-searches'
import { loadSearchColumnIds } from '@/server/columns'

const SCAN_LIMIT = 100

export async function listRecentSearches(
  email: string,
  limit: number,
): Promise<Array<RecentSearch>> {
  const rows = await db
    .select({
      id: searches.id,
      query: searches.query,
      category: searches.category,
      resultLimit: searches.resultLimit,
      mode: searches.mode,
      createdAt: searches.createdAt,
      results: count(searchResults.id),
      agentStatus: agentRuns.status,
    })
    .from(searches)
    .leftJoin(searchResults, eq(searchResults.searchId, searches.id))
    .leftJoin(agentRuns, eq(agentRuns.searchId, searches.id))
    .where(eq(searches.createdByEmail, email))
    .groupBy(searches.id, agentRuns.id)
    .orderBy(desc(searches.createdAt))
    .limit(SCAN_LIMIT)

  const seen = new Set<string>()
  const recent: Array<RecentSearch> = []
  for (const row of rows) {
    const agentStatus = isAgentRunStatus(row.agentStatus)
      ? row.agentStatus
      : null
    if (agentStatus === null && row.results === 0) continue
    const key = `${row.mode}|${row.query.toLowerCase()}|${row.category ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    recent.push({
      id: row.id,
      query: row.query,
      category: isSearchCategory(row.category) ? row.category : null,
      limit: isSearchLimit(row.resultLimit)
        ? row.resultLimit
        : DEFAULT_SEARCH_LIMIT,
      mode: isSearchMode(row.mode) ? row.mode : DEFAULT_SEARCH_MODE,
      columns: [],
      results: row.results,
      agentStatus,
      createdAt: row.createdAt.toISOString(),
    })
    if (recent.length === limit) break
  }
  const columnIds = await loadSearchColumnIds(recent.map((item) => item.id))
  return recent.map((item) => ({
    ...item,
    columns: columnIds.get(item.id) ?? [],
  }))
}
