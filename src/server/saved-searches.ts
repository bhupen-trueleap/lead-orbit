import { and, count, desc, eq, ilike, sql } from 'drizzle-orm'

import { db } from '@/db'
import { savedSearches } from '@/db/schema'
import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_MODE,
  isSearchCategory,
  isSearchLimit,
  isSearchMode,
} from '@/lib/search'
import type { SearchRequest } from '@/lib/search'
import type {
  SavedSearchFilters,
  SavedSearchesPage,
} from '@/lib/saved-searches'
import type { ResultCount } from '@/lib/pagination'
import { escapeLike } from '@/server/sql'
import {
  loadSavedSearchColumnIds,
  replaceSavedSearchColumns,
} from '@/server/columns'

export async function saveSearch(
  { query, category, limit, mode, columns: columnIds }: SearchRequest,
  email: string,
): Promise<void> {
  const saved = await db
    .insert(savedSearches)
    .values({
      query,
      category: category ?? null,
      resultLimit: limit,
      mode,
      createdByEmail: email,
    })
    .onConflictDoUpdate({
      target: [
        savedSearches.createdByEmail,
        savedSearches.query,
        savedSearches.category,
      ],
      set: { resultLimit: limit, mode, createdAt: sql`now()` },
    })
    .returning({ id: savedSearches.id })
  const savedId = saved.at(0)?.id
  if (savedId) await replaceSavedSearchColumns(savedId, columnIds)
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

  const columnIds = await loadSavedSearchColumnIds(rows.map((row) => row.id))

  return {
    savedSearches: rows.map((row) => ({
      id: row.id,
      query: row.query,
      category: isSearchCategory(row.category) ? row.category : null,
      limit: isSearchLimit(row.resultLimit)
        ? row.resultLimit
        : DEFAULT_SEARCH_LIMIT,
      mode: isSearchMode(row.mode) ? row.mode : DEFAULT_SEARCH_MODE,
      columns: columnIds.get(row.id) ?? [],
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
