import { CellValueType } from '@univerjs/presets'
import type {
  ICellData,
  IWorkbookData,
  IWorksheetData,
} from '@univerjs/presets'
import { read, utils, writeFile } from 'xlsx'
import type {
  BookType,
  CellObject,
  ColInfo,
  WorkBook,
  WorkSheet,
  WritingOptions,
} from 'xlsx'

import { isRecord } from '@/lib/guards'

export type ExportFormat = 'xlsx' | 'xls' | 'ods' | 'csv' | 'tsv'

const wholeWorkbookFormats = new Set<ExportFormat>(['xlsx', 'xls', 'ods'])

const bookTypes: Record<ExportFormat, BookType> = {
  xlsx: 'xlsx',
  xls: 'biff8',
  ods: 'ods',
  csv: 'csv',
  tsv: 'csv',
}

const MAX_SHEET_NAME = 31
const SPARE_ROWS = 100
const SPARE_COLUMNS = 5
const MIN_ROWS = 1000
const MIN_COLUMNS = 26
const PIXELS_PER_CHARACTER = 7

export interface ImportedSheet {
  name: string
  sheet: Partial<IWorksheetData>
}

function isCellObject(value: unknown): value is CellObject {
  return isRecord(value) && typeof value.t === 'string'
}

function toCellData(cell: CellObject): ICellData | null {
  const data: ICellData = {}
  if (cell.f) data.f = `=${cell.f}`
  if (cell.t === 'n' && typeof cell.v === 'number') {
    data.v = cell.v
    data.t = CellValueType.NUMBER
    const format = typeof cell.z === 'string' ? cell.z : undefined
    if (format && format !== 'General') data.s = { n: { pattern: format } }
  } else if (cell.t === 'b' && typeof cell.v === 'boolean') {
    data.v = cell.v
    data.t = CellValueType.BOOLEAN
  } else if (cell.t === 's' && typeof cell.v === 'string') {
    data.v = cell.v
    data.t = CellValueType.STRING
  } else if (cell.t === 'd' || cell.t === 'e') {
    const text = cell.w ?? (cell.v === undefined ? '' : String(cell.v))
    data.v = text
    data.t = CellValueType.STRING
  } else if (!data.f) {
    return null
  }
  return data
}

function columnWidth(info: ColInfo): number | undefined {
  if (info.wpx) return info.wpx
  if (info.wch) return Math.round(info.wch * PIXELS_PER_CHARACTER)
  return undefined
}

function toWorksheet(worksheet: WorkSheet): Partial<IWorksheetData> {
  const ref = worksheet['!ref']
  if (!ref) {
    return { rowCount: MIN_ROWS, columnCount: MIN_COLUMNS, cellData: {} }
  }
  const cellData: Record<number, Record<number, ICellData>> = {}
  let lastRow = 0
  let lastColumn = 0
  for (const address of Object.keys(worksheet)) {
    if (address.startsWith('!')) continue
    const value: unknown = worksheet[address]
    if (!isCellObject(value)) continue
    const cell = toCellData(value)
    if (!cell) continue
    const { r: row, c: column } = utils.decode_cell(address)
    cellData[row] = { ...cellData[row], [column]: cell }
    lastRow = Math.max(lastRow, row)
    lastColumn = Math.max(lastColumn, column)
  }

  const columnData: Record<number, { w: number }> = {}
  const widths = worksheet['!cols'] ?? []
  widths.forEach((info, index) => {
    if (index > lastColumn + SPARE_COLUMNS) return
    const width = columnWidth(info)
    if (width) columnData[index] = { w: width }
  })

  return {
    rowCount: Math.max(lastRow + 1 + SPARE_ROWS, MIN_ROWS),
    columnCount: Math.max(lastColumn + 1 + SPARE_COLUMNS, MIN_COLUMNS),
    cellData,
    columnData,
    mergeData: (worksheet['!merges'] ?? []).map((merge) => ({
      startRow: merge.s.r,
      endRow: merge.e.r,
      startColumn: merge.s.c,
      endColumn: merge.e.c,
    })),
  }
}

function isDelimitedText(fileName: string): 'tab' | 'other' {
  return /\.(tsv|tab)$/i.test(fileName) ? 'tab' : 'other'
}

export async function readWorkbookFile(
  file: File,
): Promise<Array<ImportedSheet>> {
  const workbook =
    isDelimitedText(file.name) === 'tab'
      ? read(await file.text(), { type: 'string', FS: '\t', cellNF: true })
      : read(await file.arrayBuffer(), {
          type: 'array',
          cellFormula: true,
          cellNF: true,
          cellText: true,
          cellStyles: true,
        })
  return workbook.SheetNames.map((name) => ({
    name,
    sheet: toWorksheet(workbook.Sheets[name]),
  }))
}

function formatOf(
  style: unknown,
  styles: IWorkbookData['styles'],
): string | undefined {
  const resolved: unknown = typeof style === 'string' ? styles[style] : style
  if (!isRecord(resolved) || !isRecord(resolved.n)) return undefined
  return typeof resolved.n.pattern === 'string' ? resolved.n.pattern : undefined
}

function toSheetCell(
  cell: unknown,
  styles: IWorkbookData['styles'],
): CellObject | null {
  if (!isRecord(cell)) return null
  const formula =
    typeof cell.f === 'string' && cell.f !== ''
      ? cell.f.replace(/^=/, '')
      : undefined
  const value = cell.v
  let result: CellObject | null = null
  if (typeof value === 'number') result = { t: 'n', v: value }
  else if (typeof value === 'boolean') result = { t: 'b', v: value }
  else if (typeof value === 'string' && value !== '') {
    result = { t: 's', v: value }
  } else if (formula) result = { t: 'n', v: 0 }
  if (!result) return null
  if (formula) result.f = formula
  const format = formatOf(cell.s, styles)
  if (format && typeof value === 'number') result.z = format
  return result
}

function safeSheetName(name: string, taken: Set<string>): string {
  const base =
    name
      .replace(/[\\/?*[\]:]/g, ' ')
      .slice(0, MAX_SHEET_NAME)
      .trim() || 'Sheet'
  let candidate = base
  for (let copy = 2; taken.has(candidate.toLowerCase()); copy += 1) {
    const suffix = ` (${copy})`
    candidate = `${base.slice(0, MAX_SHEET_NAME - suffix.length)}${suffix}`
  }
  taken.add(candidate.toLowerCase())
  return candidate
}

function toSheetJs(
  sheet: Partial<IWorksheetData>,
  styles: IWorkbookData['styles'],
): WorkSheet {
  const worksheet: WorkSheet = {}
  let lastRow = 0
  let lastColumn = 0
  for (const [rowKey, cells] of Object.entries(sheet.cellData ?? {})) {
    const row = Number(rowKey)
    for (const [columnKey, cell] of Object.entries(cells)) {
      const column = Number(columnKey)
      const converted = toSheetCell(cell, styles)
      if (!converted) continue
      worksheet[utils.encode_cell({ r: row, c: column })] = converted
      lastRow = Math.max(lastRow, row)
      lastColumn = Math.max(lastColumn, column)
    }
  }
  worksheet['!ref'] = utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: lastColumn },
  })

  const columns: Array<ColInfo> = []
  for (const [index, data] of Object.entries(sheet.columnData ?? {})) {
    if (data.w) columns[Number(index)] = { wpx: data.w }
  }
  if (columns.length > 0) worksheet['!cols'] = columns

  const merges = sheet.mergeData ?? []
  if (merges.length > 0) {
    worksheet['!merges'] = merges.map((merge) => ({
      s: { r: merge.startRow, c: merge.startColumn },
      e: { r: merge.endRow, c: merge.endColumn },
    }))
  }
  return worksheet
}

export function buildWorkbook(
  snapshot: IWorkbookData,
  activeSheetId: string,
  format: ExportFormat,
): WorkBook {
  const sheetIds = wholeWorkbookFormats.has(format)
    ? snapshot.sheetOrder
    : [activeSheetId]
  const workbook: WorkBook = utils.book_new()
  const taken = new Set<string>()
  for (const id of sheetIds) {
    if (!Object.hasOwn(snapshot.sheets, id)) continue
    const sheet = snapshot.sheets[id]
    utils.book_append_sheet(
      workbook,
      toSheetJs(sheet, snapshot.styles),
      safeSheetName(sheet.name ?? 'Sheet', taken),
    )
  }
  if (workbook.SheetNames.length === 0) {
    utils.book_append_sheet(workbook, utils.aoa_to_sheet([]), 'Sheet1')
  }
  return workbook
}

export function writeWorkbookFile(
  snapshot: IWorkbookData,
  activeSheetId: string,
  format: ExportFormat,
  baseName: string,
): void {
  const fileName = `${
    baseName.replace(/[^\w\- ]+/g, '').trim() || 'list'
  }.${format}`
  writeFile(
    buildWorkbook(snapshot, activeSheetId, format),
    fileName,
    exportOptions(format),
  )
}

export function exportOptions(format: ExportFormat): WritingOptions {
  return {
    bookType: bookTypes[format],
    compression: true,
    ...(format === 'tsv' ? { FS: '\t' } : {}),
  }
}
