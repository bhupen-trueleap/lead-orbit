import type { ColumnDef, FieldValue } from '@/lib/columns'
import { entityTypeLabel } from '@/lib/labels'
import type { SearchEntity } from '@/lib/search'

const BYTE_ORDER_MARK = '﻿'
const FORMULA_START = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/

function escapeCell(value: string): string {
  const safe =
    FORMULA_START.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

function formatValue(value: FieldValue | undefined): string {
  if (value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function toCsv(rows: Array<Array<string>>): string {
  return (
    BYTE_ORDER_MARK +
    rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
  )
}

export function entityCsvHeader(columns: Array<ColumnDef>): Array<string> {
  return ['Name', 'Type', 'URL', ...columns.map((column) => column.label)]
}

export function entityCsvRow(
  entity: SearchEntity,
  columns: Array<ColumnDef>,
): Array<string> {
  return [
    entity.name,
    entityTypeLabel(entity.type, 'one'),
    entity.url ?? '',
    ...columns.map((column) => formatValue(entity.values[column.key])),
  ]
}

export function csvFileName(label: string, date = new Date()): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const day = date.toISOString().slice(0, 10)
  return `leadorbit-${slug || 'export'}-${day}.csv`
}

export function downloadCsv(fileName: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
