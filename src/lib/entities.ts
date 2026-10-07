import { isSearchEntity } from '@/lib/search'
import type { SearchEntity } from '@/lib/search'
import { isRecord } from '@/lib/guards'
import { parseFieldValues } from '@/lib/columns'
import type { ResultCount } from '@/lib/pagination'

export const MAX_ENTITY_QUERY_LENGTH = 200

export type EntitySite = 'linkedin' | 'other'

export type EntitySort = 'recent' | 'name'

export interface ColumnFilter {
  contains?: string
  from?: number
  to?: number
}

export type ColumnFilters = Partial<Record<string, ColumnFilter>>

export const MAX_COLUMN_FILTERS = 10

export interface EntityFilters {
  cols?: ColumnFilters
  q?: string
  type?: string
  site?: EntitySite
  sort?: EntitySort
  addedFrom?: string
  addedTo?: string
}

export interface EntityTypeCount {
  type: string
  count: number
}

export interface EntitiesPage {
  entities: Array<SearchEntity>
  total: number
  types: Array<EntityTypeCount>
}

const TYPE_PATTERN = /^[a-z_]{1,32}$/

export function isEntityQuery(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() !== '' &&
    value.length <= MAX_ENTITY_QUERY_LENGTH
  )
}

export function isEntityType(value: unknown): value is string {
  return typeof value === 'string' && TYPE_PATTERN.test(value)
}

export function isEntitySite(value: unknown): value is EntitySite {
  return value === 'linkedin' || value === 'other'
}

export function isEntitySort(value: unknown): value is EntitySort {
  return value === 'recent' || value === 'name'
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

const COLUMN_KEY_PATTERN = /^[a-z0-9_]{1,48}$/

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }
  return undefined
}

function parseColumnFilter(value: unknown): ColumnFilter | null {
  if (!isRecord(value)) return null
  const contains =
    typeof value.contains === 'string' &&
    value.contains.trim() !== '' &&
    value.contains.length <= MAX_ENTITY_QUERY_LENGTH
      ? value.contains.trim()
      : undefined
  const from = finiteNumber(value.from)
  const to = finiteNumber(value.to)
  if (contains === undefined && from === undefined && to === undefined) {
    return null
  }
  return {
    ...(contains !== undefined ? { contains } : {}),
    ...(from !== undefined ? { from } : {}),
    ...(to !== undefined ? { to } : {}),
  }
}

export function parseColumnFilters(value: unknown): ColumnFilters | undefined {
  let data = value
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value)
    } catch {
      return undefined
    }
  }
  if (!isRecord(data)) return undefined
  const filters: ColumnFilters = {}
  let size = 0
  for (const [key, item] of Object.entries(data)) {
    if (size === MAX_COLUMN_FILTERS || !COLUMN_KEY_PATTERN.test(key)) continue
    const filter = parseColumnFilter(item)
    if (!filter) continue
    filters[key] = filter
    size += 1
  }
  return size > 0 ? filters : undefined
}

export function parseEntityFilters(
  input: Record<string, unknown>,
): EntityFilters {
  const cols = parseColumnFilters(input.cols)
  return {
    ...(cols ? { cols } : {}),
    ...(isEntityQuery(input.q) ? { q: input.q.trim() } : {}),
    ...(isEntityType(input.type) ? { type: input.type } : {}),
    ...(isEntitySite(input.site) ? { site: input.site } : {}),
    ...(isEntitySort(input.sort) ? { sort: input.sort } : {}),
    ...(isDateString(input.addedFrom) ? { addedFrom: input.addedFrom } : {}),
    ...(isDateString(input.addedTo) ? { addedTo: input.addedTo } : {}),
  }
}

export function isEntityTypeCount(value: unknown): value is EntityTypeCount {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    typeof value.count === 'number'
  )
}

export function entityFilterParams(filters: EntityFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') params.set(key, value)
  }
  if (filters.cols) params.set('cols', JSON.stringify(filters.cols))
  return params
}

export function entitiesExportUrl(
  filters: EntityFilters,
  columnKeys: Array<string>,
): string {
  const params = entityFilterParams(filters)
  if (columnKeys.length > 0) params.set('show', columnKeys.join(','))
  return `/api/entities-export?${params}`
}

export async function fetchEntities(
  page: number,
  pageSize: ResultCount,
  filters: EntityFilters,
  signal?: AbortSignal,
): Promise<EntitiesPage | null> {
  const params = entityFilterParams(filters)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  const response = await fetch(`/api/entities?${params}`, { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (
    !isRecord(data) ||
    !Array.isArray(data.entities) ||
    typeof data.total !== 'number' ||
    !Array.isArray(data.types)
  ) {
    return null
  }
  return {
    entities: data.entities.filter(isSearchEntity).map((entity) => ({
      ...entity,
      values: parseFieldValues(entity.values),
    })),
    total: data.total,
    types: data.types.filter(isEntityTypeCount),
  }
}
