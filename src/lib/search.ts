import { isRecord } from '@/lib/guards'
import {
  DEFAULT_AGENT_EFFORT,
  isAgentEffort,
  isAgentRunStatus,
  parseFieldEvidence,
} from '@/lib/agent'
import type { AgentEffort, AgentRunStatus, FieldEvidenceMap } from '@/lib/agent'
import { isColumnDef, parseColumnIds, parseFieldValues } from '@/lib/columns'
import type { ColumnDef, FieldValues } from '@/lib/columns'

import { isSearchCategory } from '@/lib/categories'
import type { SearchCategory } from '@/lib/categories'

export type { SearchCategory } from '@/lib/categories'
export { isSearchCategory } from '@/lib/categories'

export const MAX_QUERY_LENGTH = 500

export const MIN_SEARCH_LIMIT = 1

export const MAX_SEARCH_LIMIT = 100

export const DEFAULT_SEARCH_LIMIT = 10

export function isSearchLimit(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_SEARCH_LIMIT &&
    value <= MAX_SEARCH_LIMIT
  )
}

export function clampSearchLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SEARCH_LIMIT
  return Math.min(
    MAX_SEARCH_LIMIT,
    Math.max(MIN_SEARCH_LIMIT, Math.round(value)),
  )
}

export type SearchMode = 'fast' | 'auto' | 'deep' | 'agent'

export const SEARCH_MODES: ReadonlyArray<SearchMode> = [
  'fast',
  'auto',
  'deep',
  'agent',
]

export const DEFAULT_SEARCH_MODE: SearchMode = 'auto'

export const searchModeLabels: Record<SearchMode, string> = {
  fast: 'Fast',
  auto: 'Normal',
  deep: 'Deep',
  agent: 'Agent',
}

export const searchModeHints: Record<SearchMode, string> = {
  fast: 'Quickest search with lighter ranking',
  auto: 'Balanced search (default)',
  deep: 'Researches harder for better matches; slower and costs more',
  agent:
    'Builds a verified list and can look up emails and phones; takes longer and costs per run',
}

export const searchModeShortHints: Record<SearchMode, string> = {
  fast: '3–10 sec',
  auto: '5–20 sec',
  deep: '30–45 sec',
  agent: '1–5 min',
}

export function isSearchMode(value: unknown): value is SearchMode {
  return SEARCH_MODES.some((mode) => mode === value)
}

export interface SearchRequest {
  query: string
  category?: SearchCategory
  limit: number
  mode: SearchMode
  effort: AgentEffort
  columns: Array<string>
}

export interface SearchEntity {
  id: string
  name: string
  url: string | null
  type: string
  role: string | null
  location: string | null
  highlight: string | null
  values: FieldValues
  evidence: FieldEvidenceMap
}

export type SearchEvent =
  | { type: 'columns'; columns: Array<ColumnDef> }
  | { type: 'status'; status: AgentRunStatus; searchId: string }
  | { type: 'entity'; entity: SearchEntity }
  | { type: 'done'; searchId: string; count: number }
  | { type: 'error'; message: string }

export function parseSearchRequest(body: unknown): SearchRequest | null {
  if (!isRecord(body) || typeof body.query !== 'string') return null
  const query = body.query.trim()
  if (query === '' || query.length > MAX_QUERY_LENGTH) return null

  const limit = body.limit ?? DEFAULT_SEARCH_LIMIT
  if (!isSearchLimit(limit)) return null

  const columns = parseColumnIds(body.columns)
  if (!columns) return null

  const mode = body.mode ?? DEFAULT_SEARCH_MODE
  if (!isSearchMode(mode)) return null

  const effort = body.effort ?? DEFAULT_AGENT_EFFORT
  if (!isAgentEffort(effort)) return null

  if (body.category === undefined || body.category === null) {
    return { query, limit, mode, effort, columns }
  }
  if (!isSearchCategory(body.category)) return null
  return { query, category: body.category, limit, mode, effort, columns }
}

export function isSearchEntity(value: unknown): value is SearchEntity {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.url === 'string' || value.url === null) &&
    typeof value.type === 'string' &&
    (typeof value.role === 'string' || value.role === null) &&
    (typeof value.location === 'string' || value.location === null) &&
    (typeof value.highlight === 'string' || value.highlight === null) &&
    isRecord(value.values)
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
  if (data.type === 'columns' && Array.isArray(data.columns)) {
    return { type: 'columns', columns: data.columns.filter(isColumnDef) }
  }
  if (
    data.type === 'status' &&
    isAgentRunStatus(data.status) &&
    typeof data.searchId === 'string'
  ) {
    return { type: 'status', status: data.status, searchId: data.searchId }
  }
  if (data.type === 'entity' && isSearchEntity(data.entity)) {
    return {
      type: 'entity',
      entity: {
        ...data.entity,
        values: parseFieldValues(data.entity.values),
        evidence: parseFieldEvidence(data.entity.evidence),
      },
    }
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
