import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_MODE,
  isSearchCategory,
  isSearchMode,
  isSearchLimit,
} from '@/lib/search'
import type { SearchMode, SearchCategory, SearchRequest } from '@/lib/search'
import type { ResultCount } from '@/lib/pagination'
import { isRecord } from '@/lib/guards'
import { parseColumnIds } from '@/lib/columns'

export const MAX_SAVED_QUERY_LENGTH = 200

export interface SavedSearchFilters {
  q?: string
  category?: SearchCategory
}

export interface SavedSearchesPage {
  savedSearches: Array<SavedSearch>
  total: number
}

export function parseSavedSearchFilters(
  input: Record<string, unknown>,
): SavedSearchFilters {
  const q =
    typeof input.q === 'string' &&
    input.q.trim() !== '' &&
    input.q.length <= MAX_SAVED_QUERY_LENGTH
      ? input.q.trim()
      : undefined
  return {
    ...(q ? { q } : {}),
    ...(isSearchCategory(input.category) ? { category: input.category } : {}),
  }
}

export interface SavedSearch {
  id: string
  query: string
  category: SearchCategory | null
  limit: number
  mode: SearchMode
  columns: Array<string>
  createdAt: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseDeleteRequest(body: unknown): string | null {
  if (!isRecord(body) || typeof body.id !== 'string') return null
  return UUID_PATTERN.test(body.id) ? body.id : null
}

function parseSavedSearch(value: unknown): SavedSearch | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.query !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return null
  }
  return {
    id: value.id,
    query: value.query,
    category: isSearchCategory(value.category) ? value.category : null,
    limit: isSearchLimit(value.limit) ? value.limit : DEFAULT_SEARCH_LIMIT,
    mode: isSearchMode(value.mode) ? value.mode : DEFAULT_SEARCH_MODE,
    columns: parseColumnIds(value.columns) ?? [],
    createdAt: value.createdAt,
  }
}

export async function saveSearch(request: SearchRequest): Promise<boolean> {
  const response = await fetch('/api/saved-searches', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  })
  return response.ok
}

export async function fetchSavedSearches(
  page: number,
  pageSize: ResultCount,
  filters: SavedSearchFilters,
  signal?: AbortSignal,
): Promise<SavedSearchesPage | null> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') params.set(key, value)
  }
  const response = await fetch(`/api/saved-searches?${params}`, { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (
    !isRecord(data) ||
    !Array.isArray(data.savedSearches) ||
    typeof data.total !== 'number'
  ) {
    return null
  }
  return {
    savedSearches: data.savedSearches.flatMap((item: unknown) => {
      const saved = parseSavedSearch(item)
      return saved ? [saved] : []
    }),
    total: data.total,
  }
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  const response = await fetch('/api/saved-searches', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return response.ok
}
