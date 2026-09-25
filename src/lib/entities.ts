import { isSearchEntity } from '@/lib/search'
import type { SearchEntity } from '@/lib/search'

export type PageSize = 10 | 25 | 50 | 100

export const PAGE_SIZES: ReadonlyArray<PageSize> = [10, 25, 50, 100]

export const DEFAULT_PAGE_SIZE: PageSize = 25

export const MAX_PAGE = 100_000

export interface EntitiesPage {
  entities: Array<SearchEntity>
  total: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
  signal?: AbortSignal,
): Promise<EntitiesPage | null> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  const response = await fetch(`/api/entities?${params}`, { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (
    !isRecord(data) ||
    !Array.isArray(data.entities) ||
    typeof data.total !== 'number'
  ) {
    return null
  }
  return {
    entities: data.entities.filter(isSearchEntity),
    total: data.total,
  }
}
