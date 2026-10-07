import { isRecord } from '@/lib/guards'
import { parseName } from '@/lib/names'

export const MAX_LIST_NAME_LENGTH = 80

export type ListScope = 'mine' | 'all'

export interface List {
  id: string
  name: string
  ownerEmail: string
  isOwner: boolean
  rowCount: number
  createdAt: string
  updatedAt: string
}

export type SaveListResult =
  { status: 'ok'; list: List } | { status: 'duplicate' } | { status: 'error' }

export function parseListName(value: unknown): string | null {
  return parseName(value, MAX_LIST_NAME_LENGTH)
}

export function isListScope(value: unknown): value is ListScope {
  return value === 'mine' || value === 'all'
}

function parseList(value: unknown): List | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.ownerEmail !== 'string' ||
    typeof value.isOwner !== 'boolean' ||
    typeof value.rowCount !== 'number' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null
  }
  return {
    id: value.id,
    name: value.name,
    ownerEmail: value.ownerEmail,
    isOwner: value.isOwner,
    rowCount: value.rowCount,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

async function send(
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
): Promise<Response> {
  return fetch('/api/lists', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readSavedList(response: Response): Promise<SaveListResult> {
  if (response.status === 409) return { status: 'duplicate' }
  if (!response.ok) return { status: 'error' }
  const data: unknown = await response.json()
  const list = isRecord(data) ? parseList(data.list) : null
  return list ? { status: 'ok', list } : { status: 'error' }
}

export async function fetchLists(
  scope: ListScope,
  signal?: AbortSignal,
): Promise<Array<List> | null> {
  const response = await fetch(`/api/lists?scope=${scope}`, { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.lists)) return null
  return data.lists.flatMap((item: unknown) => {
    const list = parseList(item)
    return list ? [list] : []
  })
}

export async function fetchList(
  id: string,
  signal?: AbortSignal,
): Promise<List | 'missing' | null> {
  const response = await fetch(`/api/lists?id=${encodeURIComponent(id)}`, {
    signal,
  })
  if (response.status === 404) return 'missing'
  if (!response.ok) return null
  const data: unknown = await response.json()
  return isRecord(data) ? parseList(data.list) : null
}

export async function createList(name: string): Promise<SaveListResult> {
  return readSavedList(await send('POST', { name }))
}

export async function renameList(
  id: string,
  name: string,
): Promise<SaveListResult> {
  return readSavedList(await send('PATCH', { id, name }))
}

export async function deleteList(id: string): Promise<boolean> {
  return (await send('DELETE', { id })).ok
}

export const MAX_WORKBOOK_BYTES = 5_000_000

export interface WorkbookSnapshot {
  workbook: Record<string, unknown> | null
  canEdit: boolean
}

export function isWorkbookData(
  value: unknown,
): value is Record<string, unknown> {
  return (
    isRecord(value) && isRecord(value.sheets) && Array.isArray(value.sheetOrder)
  )
}

export async function fetchWorkbook(
  id: string,
  signal?: AbortSignal,
): Promise<WorkbookSnapshot | 'missing' | null> {
  const response = await fetch(
    `/api/list-workbook?id=${encodeURIComponent(id)}`,
    { signal },
  )
  if (response.status === 404) return 'missing'
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isRecord(data) || typeof data.canEdit !== 'boolean') return null
  return {
    workbook: isWorkbookData(data.workbook) ? data.workbook : null,
    canEdit: data.canEdit,
  }
}

export async function saveWorkbook(
  id: string,
  workbook: Record<string, unknown>,
  rowCount: number,
): Promise<boolean> {
  const response = await fetch('/api/list-workbook', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, workbook, rowCount }),
    keepalive: false,
  })
  return response.ok
}
