import {
  DEFAULT_SEARCH_LIMIT,
  isSearchCategory,
  isSearchLimit,
} from '@/lib/search'
import type { SearchCategory, SearchLimit, SearchRequest } from '@/lib/search'

export interface SavedSearch {
  id: string
  query: string
  category: SearchCategory | null
  limit: SearchLimit
  createdAt: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

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

export async function listSavedSearches(
  signal?: AbortSignal,
): Promise<Array<SavedSearch> | null> {
  const response = await fetch('/api/saved-searches', { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.savedSearches)) return null
  return data.savedSearches.flatMap((item: unknown) => {
    const saved = parseSavedSearch(item)
    return saved ? [saved] : []
  })
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  const response = await fetch('/api/saved-searches', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return response.ok
}
