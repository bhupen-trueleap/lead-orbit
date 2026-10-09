import '@univerjs/preset-sheets-core/lib/index.css'

import {
  CommandType,
  LocaleType,
  createUniver,
  defaultTheme,
  mergeLocales,
} from '@univerjs/presets'
import type { IWorkbookData, IWorksheetData } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import sheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { useEffect, useRef } from 'react'

import { isRecord } from '@/lib/guards'
import type { CellInput, ImportTable } from '@/lib/database-import'
import { isWorkbookData } from '@/lib/lists'
import { currentTheme, subscribeTheme } from '@/lib/theme'

export type SaveState = 'saved' | 'pending' | 'saving' | 'error'

export type SheetValue = string | number | boolean

export interface AppendResult {
  added: number
  skipped: number
  sheetName: string
}

export interface WorkbookHandle {
  getSnapshot: () => { workbook: IWorkbookData; activeSheetId: string }
  hasContent: () => boolean
  replaceSheets: (
    sheets: Array<{ name: string; sheet: Partial<IWorksheetData> }>,
  ) => Array<string>
  getHeaders: () => Array<string>
  getActiveTable: () => ImportTable
  appendRows: (
    rows: Array<Record<string, SheetValue>>,
    dedupeHeader?: string,
  ) => AppendResult
}

const normalize = (value: string) => value.trim().toLowerCase()

const SAVE_DELAY_MS = 1000

const STARTER_HEADERS = [
  'Name',
  'LinkedIn or website',
  'Title',
  'Company',
  'Location',
  'Email',
  'Phone',
  'Stage',
  'Next follow-up',
  'Notes',
]

function starterWorkbook(id: string, name: string): Partial<IWorkbookData> {
  const sheetId = 'leads'
  return {
    id,
    name,
    sheetOrder: [sheetId],
    styles: { header: { bl: 1, bg: { rgb: '#f4f4f5' } } },
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: 'Leads',
        rowCount: 1000,
        columnCount: 26,
        freeze: { xSplit: 0, ySplit: 1, startRow: 1, startColumn: -1 },
        cellData: {
          0: Object.fromEntries(
            STARTER_HEADERS.map((header, column) => [
              column,
              { v: header, s: 'header' },
            ]),
          ),
        },
        columnData: Object.fromEntries(
          STARTER_HEADERS.map((_, column) => [column, { w: 160 }]),
        ),
      },
    },
  }
}

function isUniverWorkbook(
  value: Record<string, unknown>,
): value is Partial<IWorkbookData> {
  return isWorkbookData(value)
}

function countRows(workbook: Record<string, unknown>): number {
  const sheets = workbook.sheets
  if (!isRecord(sheets)) return 0
  let total = 0
  for (const sheet of Object.values(sheets)) {
    if (!isRecord(sheet) || !isRecord(sheet.cellData)) continue
    for (const [row, cells] of Object.entries(sheet.cellData)) {
      if (row === '0' || !isRecord(cells)) continue
      const filled = Object.values(cells).some(
        (cell) =>
          isRecord(cell) &&
          cell.v !== undefined &&
          cell.v !== null &&
          cell.v !== '',
      )
      if (filled) total += 1
    }
  }
  return total
}

interface ListWorkbookProps {
  listId: string
  name: string
  workbook: Record<string, unknown> | null
  canEdit: boolean
  onSave: (
    workbook: Record<string, unknown>,
    rowCount: number,
  ) => Promise<boolean>
  onSaveStateChange: (state: SaveState) => void
  onReady?: (handle: WorkbookHandle | null) => void
}

export default function ListWorkbook({
  listId,
  name,
  workbook,
  canEdit,
  onSave,
  onSaveStateChange,
  onReady,
}: ListWorkbookProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onSave, onSaveStateChange, onReady })

  useEffect(() => {
    callbacks.current = { onSave, onSaveStateChange, onReady }
  }, [onSave, onSaveStateChange, onReady])

  useEffect(() => {
    const host = containerRef.current
    if (!host) return
    const container = document.createElement('div')
    container.className = 'h-full w-full'
    host.append(container)

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(sheetsCoreEnUS) },
      theme: defaultTheme,
      darkMode: currentTheme() === 'dark',
      presets: [UniverSheetsCorePreset({ container })],
    })

    const initial =
      workbook && isUniverWorkbook(workbook)
        ? { ...workbook, id: listId, name }
        : starterWorkbook(listId, name)
    const fWorkbook = univerAPI.createWorkbook(initial)
    if (!canEdit) fWorkbook.setEditable(false)

    const serialize = () => JSON.stringify(fWorkbook.save())
    let lastSaved = serialize()
    let timer: ReturnType<typeof setTimeout> | null = null
    const changes = { pending: false }
    const hasPendingChanges = () => changes.pending

    async function save() {
      timer = null
      changes.pending = false
      const text = serialize()
      if (text === lastSaved) return
      const plain: unknown = JSON.parse(text)
      if (!isRecord(plain)) return
      callbacks.current.onSaveStateChange('saving')
      const ok = await callbacks.current
        .onSave(plain, countRows(plain))
        .catch(() => false)
      if (ok) lastSaved = text
      callbacks.current.onSaveStateChange(
        ok ? (hasPendingChanges() ? 'pending' : 'saved') : 'error',
      )
    }

    const subscription = univerAPI.addEvent(
      univerAPI.Event.CommandExecuted,
      (event) => {
        if (!canEdit || event.type === CommandType.OPERATION) return
        changes.pending = true
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => void save(), SAVE_DELAY_MS)
      },
    )

    function readHeaders(): Array<string> {
      const sheet = fWorkbook.getActiveSheet()
      const width = sheet.getLastColumn() + 1
      const row = sheet.getRange(0, 0, 1, width).getValues().at(0) ?? []
      const headers = row.map((value) =>
        value === null || value === undefined ? '' : String(value).trim(),
      )
      while (headers.length > 0 && headers.at(-1) === '') headers.pop()
      return headers
    }

    function uniqueSheetName(wanted: string, taken: Set<string>): string {
      const base = wanted.trim().slice(0, 31) || 'Imported'
      let candidate = base
      for (let copy = 2; taken.has(normalize(candidate)); copy += 1) {
        const suffix = ` (${copy})`
        candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
      }
      taken.add(normalize(candidate))
      return candidate
    }

    callbacks.current.onReady?.({
      getSnapshot: () => ({
        workbook: fWorkbook.save(),
        activeSheetId: fWorkbook.getActiveSheet().getSheetId(),
      }),
      hasContent: () =>
        fWorkbook.getSheets().length > 1 ||
        fWorkbook.getSheets().some((sheet) => {
          const lastRow = sheet.getLastRow()
          if (lastRow < 1) return false
          const width = sheet.getLastColumn() + 1
          return sheet
            .getRange(1, 0, lastRow, width)
            .getValues()
            .some((row) =>
              row.some(
                (value) =>
                  value !== null && value !== undefined && value !== '',
              ),
            )
        }),
      replaceSheets: (sheets) => {
        const previous = fWorkbook.getSheets()
        const temporaryNames = new Set(
          previous.map((sheet) => normalize(sheet.getSheetName())),
        )
        const finalNames = new Set<string>()
        const inserted = sheets.map((imported, index) => {
          const temporary = uniqueSheetName(
            `Importing ${index + 1}`,
            temporaryNames,
          )
          return {
            worksheet: fWorkbook.insertSheet(temporary, {
              sheet: { ...imported.sheet, name: temporary },
            }),
            title: uniqueSheetName(imported.name, finalNames),
          }
        })
        const first = inserted.at(0)
        if (!first) return []
        for (const sheet of previous) fWorkbook.deleteSheet(sheet)
        for (const { worksheet, title } of inserted) worksheet.setName(title)
        fWorkbook.setActiveSheet(first.worksheet)
        return inserted.map(({ title }) => title)
      },
      getHeaders: readHeaders,
      getActiveTable: () => {
        const sheet = fWorkbook.getActiveSheet()
        const height = sheet.getLastRow() + 1
        const width = sheet.getLastColumn() + 1
        const matrix = sheet.getRange(0, 0, height, width).getValues()
        const toCell = (value: unknown): CellInput =>
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
            ? value
            : null
        const [first = [], ...rest] = matrix
        return {
          name: sheet.getSheetName(),
          headers: first.map((value) => {
            const cell = toCell(value)
            return cell === null ? '' : String(cell).trim()
          }),
          rows: rest.map((row) => row.map(toCell)),
        }
      },
      appendRows: (rows, dedupeHeader) => {
        const sheet = fWorkbook.getActiveSheet()
        const headers = readHeaders()
        const wanted = new Set(rows.flatMap((row) => Object.keys(row)))
        for (const header of wanted) {
          if (
            headers.some(
              (existing) => normalize(existing) === normalize(header),
            )
          ) {
            continue
          }
          const column = headers.length
          if (column >= sheet.getMaxColumns()) {
            sheet.insertColumnsAfter(sheet.getMaxColumns() - 1, 1)
          }
          sheet.getRange(0, column).setValue(header).setFontWeight('bold')
          headers.push(header)
        }
        const index = new Map(
          headers.map((header, column) => [normalize(header), column]),
        )

        const firstFree = Math.max(1, sheet.getLastRow() + 1)
        const dedupeColumn =
          dedupeHeader === undefined
            ? undefined
            : index.get(normalize(dedupeHeader))
        const seen = new Set<string>()
        if (dedupeColumn !== undefined && firstFree > 1) {
          for (const [value] of sheet
            .getRange(1, dedupeColumn, firstFree - 1, 1)
            .getValues()) {
            if (value !== null && value !== undefined && value !== '') {
              seen.add(normalize(String(value)))
            }
          }
        }

        const matrix: Array<Array<SheetValue>> = []
        let skipped = 0
        for (const row of rows) {
          const key = dedupeHeader === undefined ? undefined : row[dedupeHeader]
          if (key !== undefined && key !== '') {
            const normalized = normalize(String(key))
            if (seen.has(normalized)) {
              skipped += 1
              continue
            }
            seen.add(normalized)
          }
          const line: Array<SheetValue> = headers.map(() => '')
          for (const [header, value] of Object.entries(row)) {
            const column = index.get(normalize(header))
            if (column !== undefined) line[column] = value
          }
          matrix.push(line)
        }

        if (matrix.length > 0) {
          const needed = firstFree + matrix.length - sheet.getMaxRows()
          if (needed > 0) sheet.insertRowsAfter(sheet.getMaxRows() - 1, needed)
          sheet
            .getRange(firstFree, 0, matrix.length, headers.length)
            .setValues(matrix)
        }
        return {
          added: matrix.length,
          skipped,
          sheetName: sheet.getSheetName(),
        }
      },
    })

    function warnIfUnsaved(event: BeforeUnloadEvent) {
      if (changes.pending) event.preventDefault()
    }
    window.addEventListener('beforeunload', warnIfUnsaved)
    const unsubscribeTheme = subscribeTheme(() => {
      univerAPI.toggleDarkMode(currentTheme() === 'dark')
    })

    return () => {
      callbacks.current.onReady?.(null)
      window.removeEventListener('beforeunload', warnIfUnsaved)
      unsubscribeTheme()
      subscription.dispose()
      if (timer) clearTimeout(timer)
      if (changes.pending) void save()
      setTimeout(() => {
        univer.dispose()
        container.remove()
      })
    }
  }, [listId, name, workbook, canEdit])

  return (
    <div ref={containerRef} className="h-full min-h-0 w-full overflow-hidden" />
  )
}
