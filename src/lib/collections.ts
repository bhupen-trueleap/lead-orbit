import { isUuid, parseFieldValues } from '@/lib/columns'
import { parseFieldEvidence } from '@/lib/agent'
import { isRecord } from '@/lib/guards'
import { parseName } from '@/lib/names'
import { isSearchEntity } from '@/lib/search'
import type { SearchEntity } from '@/lib/search'
import type { ResultCount } from '@/lib/pagination'
import { entityFilterParams, isEntityTypeCount } from '@/lib/entities'
import type { EntityFilters, EntityTypeCount } from '@/lib/entities'

export const MAX_COLLECTION_NAME_LENGTH = 80

export const MAX_COLLECTION_ITEMS_PER_REQUEST = 500

export interface Collection {
  id: string
  name: string
  itemCount: number
  updatedAt: string
}

export interface AddItemsResult {
  added: number
  alreadyIn: number
}

export interface CollectionPage {
  collection: Collection
  entities: Array<SearchEntity>
  total: number
  types: Array<EntityTypeCount>
}

export type SaveCollectionResult =
  | { status: 'ok'; collection: Collection }
  | { status: 'duplicate' }
  | { status: 'error' }

export function parseCollectionName(value: unknown): string | null {
  return parseName(value, MAX_COLLECTION_NAME_LENGTH)
}

export function parseItemIds(value: unknown): Array<string> | null {
  if (!Array.isArray(value)) return null
  const ids = [...new Set(value.filter(isUuid))]
  return ids.length === 0 ||
    ids.length !== value.length ||
    ids.length > MAX_COLLECTION_ITEMS_PER_REQUEST
    ? null
    : ids
}

function parseCollection(value: unknown): Collection | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.itemCount !== 'number' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null
  }
  return {
    id: value.id,
    name: value.name,
    itemCount: value.itemCount,
    updatedAt: value.updatedAt,
  }
}

async function send(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
): Promise<Response> {
  return fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readSavedCollection(
  response: Response,
): Promise<SaveCollectionResult> {
  if (response.status === 409) return { status: 'duplicate' }
  if (!response.ok) return { status: 'error' }
  const data: unknown = await response.json()
  const collection = isRecord(data) ? parseCollection(data.collection) : null
  return collection ? { status: 'ok', collection } : { status: 'error' }
}

export async function fetchCollections(
  signal?: AbortSignal,
): Promise<Array<Collection> | null> {
  const response = await fetch('/api/collections', { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.collections)) return null
  return data.collections.flatMap((item: unknown) => {
    const collection = parseCollection(item)
    return collection ? [collection] : []
  })
}

export async function createCollection(
  name: string,
): Promise<SaveCollectionResult> {
  return readSavedCollection(await send('/api/collections', 'POST', { name }))
}

export async function renameCollection(
  id: string,
  name: string,
): Promise<SaveCollectionResult> {
  return readSavedCollection(
    await send('/api/collections', 'PATCH', { id, name }),
  )
}

export async function deleteCollection(id: string): Promise<boolean> {
  return (await send('/api/collections', 'DELETE', { id })).ok
}

export async function addCollectionItems(
  collectionId: string,
  ids: Array<string>,
): Promise<AddItemsResult | null> {
  const response = await send('/api/collection-items', 'POST', {
    collectionId,
    ids,
  })
  if (!response.ok) return null
  const data: unknown = await response.json()
  return isRecord(data) &&
    typeof data.added === 'number' &&
    typeof data.alreadyIn === 'number'
    ? { added: data.added, alreadyIn: data.alreadyIn }
    : null
}

export async function removeCollectionItems(
  collectionId: string,
  ids: Array<string>,
): Promise<boolean> {
  return (await send('/api/collection-items', 'DELETE', { collectionId, ids }))
    .ok
}

export async function fetchCollectionPage(
  collectionId: string,
  page: number,
  pageSize: ResultCount,
  filters: EntityFilters,
  signal?: AbortSignal,
): Promise<CollectionPage | 'missing' | null> {
  const params = entityFilterParams(filters)
  params.set('collectionId', collectionId)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  const response = await fetch(`/api/collection-items?${params}`, { signal })
  if (response.status === 404) return 'missing'
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (
    !isRecord(data) ||
    !Array.isArray(data.entities) ||
    !Array.isArray(data.types) ||
    typeof data.total !== 'number'
  ) {
    return null
  }
  const collection = parseCollection(data.collection)
  if (!collection) return null
  return {
    collection,
    entities: data.entities.filter(isSearchEntity).map((entity) => ({
      ...entity,
      values: parseFieldValues(entity.values),
      evidence: parseFieldEvidence(entity.evidence),
    })),
    total: data.total,
    types: data.types.filter(isEntityTypeCount),
  }
}

export function collectionExportUrl(
  collectionId: string,
  filters: EntityFilters,
  columnKeys: Array<string>,
): string {
  const params = entityFilterParams(filters)
  params.set('collectionId', collectionId)
  if (columnKeys.length > 0) params.set('show', columnKeys.join(','))
  return `/api/collection-export?${params}`
}
