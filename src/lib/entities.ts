import { isSearchEntity } from '@/lib/search'
import type { SearchEntity } from '@/lib/search'

export type PageSize = 10 | 25 | 50 | 100

export const PAGE_SIZES: ReadonlyArray<PageSize> = [10, 25, 50, 100]

export const DEFAULT_PAGE_SIZE: PageSize = 25

export const MAX_PAGE = 100_000

export const MAX_ENTITY_QUERY_LENGTH = 200

export type EntitySite = 'linkedin' | 'other'

export type EntitySort = 'recent' | 'name'

export interface EntityFilters {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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

export function parseEntityFilters(
  input: Record<string, unknown>,
): EntityFilters {
  return {
    ...(isEntityQuery(input.q) ? { q: input.q.trim() } : {}),
    ...(isEntityType(input.type) ? { type: input.type } : {}),
    ...(isEntitySite(input.site) ? { site: input.site } : {}),
    ...(isEntitySort(input.sort) ? { sort: input.sort } : {}),
    ...(isDateString(input.addedFrom) ? { addedFrom: input.addedFrom } : {}),
    ...(isDateString(input.addedTo) ? { addedTo: input.addedTo } : {}),
  }
}

function isEntityTypeCount(value: unknown): value is EntityTypeCount {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    typeof value.count === 'number'
  )
}

export function isPageSize(value: unknown): value is PageSize {
  return PAGE_SIZES.some((size) => size === value)
}

export function isPage(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_PAGE
  )
}

export async function fetchEntities(
  page: number,
  pageSize: PageSize,
  filters: EntityFilters,
  signal?: AbortSignal,
): Promise<EntitiesPage | null> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') params.set(key, value)
  }
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
    entities: data.entities.filter(isSearchEntity),
    total: data.total,
    types: data.types.filter(isEntityTypeCount),
  }
}
