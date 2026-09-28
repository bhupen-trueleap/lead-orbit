import { and, count, desc, eq, ilike, sql } from 'drizzle-orm'

import { db } from '@/db'
import { savedSearches } from '@/db/schema'
import { DEFAULT_SEARCH_LIMIT, isSearchCategory } from '@/lib/search'
import type { SearchRequest } from '@/lib/search'
import type {
  SavedSearchFilters,
  SavedSearchesPage,
} from '@/lib/saved-searches'
import { isResultCount } from '@/lib/pagination'
import type { ResultCount } from '@/lib/pagination'
import { escapeLike } from '@/server/sql'

export async function saveSearch(
  { query, category, limit }: SearchRequest,
  email: string,
): Promise<void> {
  await db
    .insert(savedSearches)
    .values({
      query,
      category: category ?? null,
      resultLimit: limit,
      createdByEmail: email,
    })
    .onConflictDoUpdate({
      target: [
        savedSearches.createdByEmail,
        savedSearches.query,
        savedSearches.category,
      ],
      set: { resultLimit: limit, createdAt: sql`now()` },
    })
}

export async function listSavedSearches(
  email: string,
  page: number,
  pageSize: ResultCount,
  { q, category }: SavedSearchFilters,
): Promise<SavedSearchesPage> {
  const where = and(
    eq(savedSearches.createdByEmail, email),
    q ? ilike(savedSearches.query, `%${escapeLike(q)}%`) : undefined,
    category ? eq(savedSearches.category, category) : undefined,
  )

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(savedSearches)
      .where(where)
      .orderBy(desc(savedSearches.createdAt), desc(savedSearches.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(savedSearches).where(where),
  ])

  return {
    savedSearches: rows.map((row) => ({
      id: row.id,
      query: row.query,
      category: isSearchCategory(row.category) ? row.category : null,
      limit: isResultCount(row.resultLimit)
        ? row.resultLimit
        : DEFAULT_SEARCH_LIMIT,
      createdAt: row.createdAt.toISOString(),
    })),
    total: totals.at(0)?.total ?? 0,
  }
}

export async function deleteSavedSearch(
  id: string,
  email: string,
): Promise<void> {
  await db
    .delete(savedSearches)
    .where(
      and(eq(savedSearches.id, id), eq(savedSearches.createdByEmail, email)),
    )
}
