import { isRecord } from '@/lib/guards'
import { isSearchCategory } from '@/lib/categories'
import type { SearchCategory } from '@/lib/categories'

export type ColumnType = 'text' | 'number' | 'boolean'

export type ColumnScope = 'entity' | 'search'

export type DefaultGroup = 'all' | SearchCategory

export type FieldValue = string | number | boolean

export type FieldValues = Partial<Record<string, FieldValue>>

export interface ColumnDef {
  id: string
  key: string
  label: string
  type: ColumnType
  instruction: string
  category: SearchCategory | null
  scope: ColumnScope
  isPreset: boolean
  defaultIn: Array<DefaultGroup>
  sortOrder: number
}

export interface ColumnDraft {
  label: string
  type: ColumnType
  instruction: string
  scope: ColumnScope
  category: SearchCategory | null
}

export const MAX_COLUMNS_PER_SEARCH = 20
export const MAX_COLUMN_LABEL_LENGTH = 60
export const MAX_COLUMN_INSTRUCTION_LENGTH = 300

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const columnTypeLabels: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Yes / no',
}

export function isColumnType(value: unknown): value is ColumnType {
  return value === 'text' || value === 'number' || value === 'boolean'
}

export function isDefaultGroup(value: unknown): value is DefaultGroup {
  return value === 'all' || isSearchCategory(value)
}

export function defaultGroupFor(
  category: SearchCategory | undefined,
): DefaultGroup {
  return category ?? 'all'
}

export function isColumnScope(value: unknown): value is ColumnScope {
  return value === 'entity' || value === 'search'
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function defaultScopeFor(type: ColumnType): ColumnScope {
  return type === 'boolean' ? 'search' : 'entity'
}

export function columnKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
}

export function isColumnDef(value: unknown): value is ColumnDef {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.key === 'string' &&
    typeof value.label === 'string' &&
    isColumnType(value.type) &&
    typeof value.instruction === 'string' &&
    (value.category === null || isSearchCategory(value.category)) &&
    isColumnScope(value.scope) &&
    typeof value.isPreset === 'boolean' &&
    Array.isArray(value.defaultIn) &&
    value.defaultIn.every(isDefaultGroup) &&
    typeof value.sortOrder === 'number'
  )
}

export function parseColumnDraft(body: unknown): ColumnDraft | null {
  if (!isRecord(body) || typeof body.label !== 'string') return null
  const label = body.label.trim()
  if (
    label === '' ||
    label.length > MAX_COLUMN_LABEL_LENGTH ||
    columnKeyFromLabel(label) === ''
  ) {
    return null
  }
  if (!isColumnType(body.type)) return null
  const instruction =
    typeof body.instruction === 'string' ? body.instruction.trim() : ''
  if (instruction.length > MAX_COLUMN_INSTRUCTION_LENGTH) return null
  const scope = isColumnScope(body.scope)
    ? body.scope
    : defaultScopeFor(body.type)
  const category = isSearchCategory(body.category) ? body.category : null
  return {
    label,
    type: body.type,
    instruction: instruction === '' ? label : instruction,
    scope,
    category,
  }
}

export function parseColumnIds(value: unknown): Array<string> | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > MAX_COLUMNS_PER_SEARCH) {
    return null
  }
  if (!value.every(isUuid)) return null
  return [...new Set(value)]
}

export function columnIdsFromParam(value: string | undefined): Array<string> {
  if (!value) return []
  return parseColumnIds(value.split(',')) ?? []
}

export function columnIdsToParam(ids: Array<string>): string | undefined {
  return ids.length > 0 ? ids.join(',') : undefined
}

export function isFieldValue(value: unknown): value is FieldValue {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

export function parseFieldValues(value: unknown): FieldValues {
  if (!isRecord(value)) return {}
  const values: FieldValues = {}
  for (const [key, item] of Object.entries(value)) {
    if (isFieldValue(item)) values[key] = item
  }
  return values
}

export function presetColumnsFor(
  columns: Array<ColumnDef>,
  category: SearchCategory | undefined,
): Array<ColumnDef> {
  const group = defaultGroupFor(category)
  return columns
    .filter((column) => column.defaultIn.includes(group))
    .sort((left, right) => left.sortOrder - right.sortOrder)
}

export async function fetchColumns(
  signal?: AbortSignal,
): Promise<Array<ColumnDef> | null> {
  const response = await fetch('/api/columns', { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.columns)) return null
  return data.columns.filter(isColumnDef)
}

export async function createColumn(
  draft: ColumnDraft,
): Promise<ColumnDef | null> {
  const response = await fetch('/api/columns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(draft),
  })
  if (!response.ok) return null
  const data: unknown = await response.json()
  return isRecord(data) && isColumnDef(data.column) ? data.column : null
}
