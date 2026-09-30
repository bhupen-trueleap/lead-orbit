import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_MODE,
  isSearchCategory,
  isSearchMode,
  isSearchLimit,
} from '@/lib/search'
import type { SearchMode, SearchCategory } from '@/lib/search'
import { isRecord } from '@/lib/guards'
import { isAgentRunStatus } from '@/lib/agent'
import type { AgentRunStatus } from '@/lib/agent'
import { parseColumnIds } from '@/lib/columns'

export interface RecentSearch {
  id: string
  query: string
  category: SearchCategory | null
  limit: number
  mode: SearchMode
  columns: Array<string>
  results: number
  agentStatus: AgentRunStatus | null
  createdAt: string
}

function parseRecentSearch(value: unknown): RecentSearch | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.query !== 'string' ||
    typeof value.results !== 'number' ||
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
    results: value.results,
    agentStatus: isAgentRunStatus(value.agentStatus) ? value.agentStatus : null,
    createdAt: value.createdAt,
  }
}

export async function fetchRecentSearches(
  signal?: AbortSignal,
): Promise<Array<RecentSearch> | null> {
  const response = await fetch('/api/recent-searches', { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.searches)) return null
  return data.searches.flatMap((item: unknown) => {
    const search = parseRecentSearch(item)
    return search ? [search] : []
  })
}

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeTime.format(Math.round(seconds / size), unit)
    }
  }
  return 'just now'
}
