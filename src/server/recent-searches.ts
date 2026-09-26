import { count, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { searchResults, searches } from '@/db/schema'
import { isSearchCategory } from '@/lib/search'
import type { RecentSearch } from '@/lib/recent-searches'

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
      createdAt: searches.createdAt,
      results: count(searchResults.id),
    })
    .from(searches)
    .leftJoin(searchResults, eq(searchResults.searchId, searches.id))
    .where(eq(searches.createdByEmail, email))
    .groupBy(searches.id)
    .orderBy(desc(searches.createdAt))
    .limit(SCAN_LIMIT)

  const seen = new Set<string>()
  const recent: Array<RecentSearch> = []
  for (const row of rows) {
    const key = `${row.query.toLowerCase()}|${row.category ?? ''}`
    if (row.results === 0 || seen.has(key)) continue
    seen.add(key)
    recent.push({
      id: row.id,
      query: row.query,
      category: isSearchCategory(row.category) ? row.category : null,
      results: row.results,
      createdAt: row.createdAt.toISOString(),
    })
    if (recent.length === limit) break
  }
  return recent
}
