import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { savedSearches } from '@/db/schema'
import {
  DEFAULT_SEARCH_LIMIT,
  isSearchCategory,
  isSearchLimit,
} from '@/lib/search'
import type { SearchRequest } from '@/lib/search'
import type { SavedSearch } from '@/lib/saved-searches'

const LIST_LIMIT = 100

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
): Promise<Array<SavedSearch>> {
  const rows = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.createdByEmail, email))
    .orderBy(desc(savedSearches.createdAt))
    .limit(LIST_LIMIT)

  return rows.map((row) => ({
    id: row.id,
    query: row.query,
    category: isSearchCategory(row.category) ? row.category : null,
    limit: isSearchLimit(row.resultLimit)
      ? row.resultLimit
      : DEFAULT_SEARCH_LIMIT,
    createdAt: row.createdAt.toISOString(),
  }))
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
