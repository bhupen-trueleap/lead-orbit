import type { ColumnDef, ColumnType, FieldValue } from '@/lib/columns'
import { isRecord } from '@/lib/guards'
import { normalizeUrl } from '@/lib/url'

export type CellInput = string | number | boolean | null

export interface ImportTable {
  name: string
  headers: Array<string>
  rows: Array<Array<CellInput>>
}

export type EntityKind = 'person' | 'company'
export type TypeChoice = 'detect' | EntityKind

export type ImportTarget = 'name' | 'url' | 'type' | 'new' | 'ignore' | string

export interface ImportRow {
  name: string
  url: string
  type: EntityKind | null
  values: Record<string, FieldValue>
}

export interface ImportCounts {
  created: number
  filled: number
  unchanged: number
}

export interface PreparedImport {
  rows: Array<ImportRow>
  skippedNoName: number
  skippedNoUrl: number
  skippedInvalidUrl: number
  duplicateInFile: number
}

export const MAX_IMPORT_ROWS = 20_000
export const IMPORT_BATCH_SIZE = 500

const NAME_HEADERS = ['name', 'full name', 'lead', 'person', 'company name']
const URL_HEADERS = [
  'linkedin or website',
  'linkedin',
  'linkedin url',
  'linkedin profile',
  'url',
  'website',
  'link',
  'profile',
  'profile url',
]
const TYPE_HEADERS = ['type', 'kind', 'entity type']

const normalize = (value: string) => value.trim().toLowerCase()

export function columnTarget(id: string): ImportTarget {
  return `column:${id}`
}

export function columnIdOf(target: ImportTarget): string | null {
  return target.startsWith('column:') ? target.slice('column:'.length) : null
}

export function suggestTargets(
  headers: Array<string>,
  columns: Array<ColumnDef>,
): Array<ImportTarget> {
  const byLabel = new Map<string, ColumnDef>()
  for (const column of columns) {
    if (column.scope !== 'entity') continue
    byLabel.set(normalize(column.label), column)
    byLabel.set(normalize(column.key.replaceAll('_', ' ')), column)
  }
  let nameTaken = false
  let urlTaken = false
  let typeTaken = false
  const used = new Set<string>()
  return headers.map((header) => {
    const key = normalize(header)
    if (key === '') return 'ignore'
    if (!nameTaken && NAME_HEADERS.includes(key)) {
      nameTaken = true
      return 'name'
    }
    if (!urlTaken && URL_HEADERS.includes(key)) {
      urlTaken = true
      return 'url'
    }
    if (!typeTaken && TYPE_HEADERS.includes(key)) {
      typeTaken = true
      return 'type'
    }
    const column = byLabel.get(key)
    if (column && !used.has(column.id)) {
      used.add(column.id)
      return columnTarget(column.id)
    }
    return 'ignore'
  })
}

export function inferColumnType(values: Array<CellInput>): ColumnType {
  const present = values.filter(
    (value) => value !== null && String(value).trim() !== '',
  )
  if (present.length === 0) return 'text'
  if (
    present.every(
      (value) =>
        typeof value === 'boolean' ||
        ['yes', 'no', 'true', 'false'].includes(normalize(String(value))),
    )
  ) {
    return 'boolean'
  }
  if (
    present.every(
      (value) =>
        typeof value === 'number' ||
        Number.isFinite(Number(String(value).replace(/[,\s]/g, ''))),
    )
  ) {
    return 'number'
  }
  return 'text'
}

function cellText(value: CellInput | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export function toEntityKind(value: string): EntityKind | null {
  const key = normalize(value)
  if (['person', 'people', 'individual', 'contact'].includes(key)) {
    return 'person'
  }
  if (
    [
      'company',
      'companies',
      'organization',
      'organisation',
      'business',
    ].includes(key)
  ) {
    return 'company'
  }
  return null
}

export function normalizeImportUrl(value: string): string | null {
  const text = value.trim()
  if (text === '' || /\s/.test(text)) return null
  const url = normalizeUrl(
    /^https?:\/\//i.test(text) ? text : `https://${text}`,
  )
  if (!url) return null
  const host = new URL(url).hostname
  return host.includes('.') && !host.startsWith('.') && !host.endsWith('.')
    ? url
    : null
}

export function prepareImport(
  table: ImportTable,
  targets: Array<ImportTarget>,
  columnIdsByHeader: Map<number, string>,
): PreparedImport {
  const nameIndex = targets.indexOf('name')
  const urlIndex = targets.indexOf('url')
  const typeIndex = targets.indexOf('type')
  const seen = new Set<string>()
  const prepared: PreparedImport = {
    rows: [],
    skippedNoName: 0,
    skippedNoUrl: 0,
    skippedInvalidUrl: 0,
    duplicateInFile: 0,
  }

  for (const row of table.rows) {
    if (row.every((cell) => cellText(cell) === '')) continue
    const name = cellText(row[nameIndex])
    const rawUrl = cellText(row[urlIndex])
    if (name === '') {
      prepared.skippedNoName += 1
      continue
    }
    if (rawUrl === '') {
      prepared.skippedNoUrl += 1
      continue
    }
    const url = normalizeImportUrl(rawUrl)
    if (!url) {
      prepared.skippedInvalidUrl += 1
      continue
    }
    if (seen.has(url)) {
      prepared.duplicateInFile += 1
      continue
    }
    seen.add(url)

    const values: Record<string, FieldValue> = {}
    for (const [index, columnId] of columnIdsByHeader) {
      const value = row[index]
      if (cellText(value) === '') {
        continue
      }
      if (value === null) continue
      values[columnId] = typeof value === 'string' ? value.trim() : value
    }
    prepared.rows.push({
      name,
      url,
      type: typeIndex === -1 ? null : toEntityKind(cellText(row[typeIndex])),
      values,
    })
  }
  return prepared
}

export function isTypeChoice(value: unknown): value is TypeChoice {
  return value === 'detect' || value === 'person' || value === 'company'
}

export async function sendImportBatch(
  rows: Array<ImportRow>,
  defaultType: TypeChoice,
): Promise<ImportCounts | null> {
  const response = await fetch('/api/database-import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rows, defaultType }),
  })
  if (!response.ok) return null
  const data: unknown = await response.json()
  return isRecord(data) &&
    typeof data.created === 'number' &&
    typeof data.filled === 'number' &&
    typeof data.unchanged === 'number'
    ? { created: data.created, filled: data.filled, unchanged: data.unchanged }
    : null
}
