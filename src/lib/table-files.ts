import type { CellInput, ImportTable } from '@/lib/database-import'

export const TABLE_FILE_ACCEPT =
  '.xlsx,.xlsm,.xlsb,.xls,.ods,.fods,.numbers,.csv,.tsv,.txt'

function loadSheetJs() {
  return import.meta.env.SSR
    ? Promise.reject(new Error('Spreadsheet files are read in the browser'))
    : import('xlsx')
}

function toCell(value: unknown): CellInput {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  return null
}

export async function readTables(file: File): Promise<Array<ImportTable>> {
  const { read, utils } = await loadSheetJs()
  const book = /\.(tsv|tab)$/i.test(file.name)
    ? read(await file.text(), { type: 'string', FS: '\t' })
    : read(await file.arrayBuffer(), { type: 'array' })
  return book.SheetNames.map((name) => {
    const sheet = book.Sheets[name]
    let lastRow = 0
    let lastColumn = 0
    for (const address of Object.keys(sheet)) {
      if (address.startsWith('!')) continue
      const { r, c } = utils.decode_cell(address)
      lastRow = Math.max(lastRow, r)
      lastColumn = Math.max(lastColumn, c)
    }
    const matrix: Array<Array<unknown>> = utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
      range: { s: { r: 0, c: 0 }, e: { r: lastRow, c: lastColumn } },
    })
    const [first = [], ...rest] = matrix
    return {
      name,
      headers: first.map((cell) => {
        const value = toCell(cell)
        return value === null ? '' : String(value).trim()
      }),
      rows: rest.map((row) => row.map(toCell)),
    }
  })
}
