export const MAX_QUERY_LENGTH = 500

export type SearchCategory = 'people' | 'company'

export type SearchLimit = 10 | 25 | 50

export const SEARCH_LIMITS: ReadonlyArray<SearchLimit> = [10, 25, 50]

export const DEFAULT_SEARCH_LIMIT: SearchLimit = 10

export type SearchSource = 'database' | 'exa'

export interface SearchRequest {
  query: string
  category?: SearchCategory
  limit: SearchLimit
}

export interface SearchEntity {
  id: string
  name: string
  url: string | null
  type: string
  highlight: string | null
  source: SearchSource
}

export type SearchEvent =
  | { type: 'entity'; entity: SearchEntity }
  | { type: 'done'; searchId: string; count: number }
  | { type: 'error'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isSearchCategory(value: unknown): value is SearchCategory {
  return value === 'people' || value === 'company'
}

export function isSearchLimit(value: unknown): value is SearchLimit {
  return SEARCH_LIMITS.some((limit) => limit === value)
}

export function parseSearchRequest(body: unknown): SearchRequest | null {
  if (!isRecord(body) || typeof body.query !== 'string') return null
  const query = body.query.trim()
  if (query === '' || query.length > MAX_QUERY_LENGTH) return null

  const limit = body.limit ?? DEFAULT_SEARCH_LIMIT
  if (!isSearchLimit(limit)) return null

  if (body.category === undefined || body.category === null) {
    return { query, limit }
  }
  if (!isSearchCategory(body.category)) return null
  return { query, category: body.category, limit }
}

function isSearchEntity(value: unknown): value is SearchEntity {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.url === 'string' || value.url === null) &&
    typeof value.type === 'string' &&
    (typeof value.highlight === 'string' || value.highlight === null) &&
    (value.source === 'database' || value.source === 'exa')
  )
}

export function parseSearchEvent(line: string): SearchEvent | null {
  let data: unknown
  try {
    data = JSON.parse(line)
  } catch {
    return null
  }
  if (!isRecord(data)) return null
  if (data.type === 'entity' && isSearchEntity(data.entity)) {
    return { type: 'entity', entity: data.entity }
  }
  if (
    data.type === 'done' &&
    typeof data.searchId === 'string' &&
    typeof data.count === 'number'
  ) {
    return { type: 'done', searchId: data.searchId, count: data.count }
  }
  if (data.type === 'error' && typeof data.message === 'string') {
    return { type: 'error', message: data.message }
  }
  return null
}
