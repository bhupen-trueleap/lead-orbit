import { DatabaseZap, Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { DatabaseImportDialog } from '@/components/database-import-dialog'
import type { WorkbookHandle } from '@/components/lists/list-workbook'
import type {
  ExportFormat,
  ImportedSheet,
} from '@/components/lists/workbook-files'
import type { ImportTable } from '@/lib/database-import'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const IMPORT_ACCEPT =
  '.xlsx,.xlsm,.xlsb,.xls,.ods,.fods,.numbers,.csv,.tsv,.txt'
const MAX_IMPORT_BYTES = 20 * 1024 * 1024

function loadFileTools() {
  return import.meta.env.SSR
    ? Promise.reject(new Error('File tools run in the browser only'))
    : import('@/components/lists/workbook-files')
}

const workbookFormats: Array<{ format: ExportFormat; label: string }> = [
  { format: 'xlsx', label: 'Excel (.xlsx)' },
  { format: 'xls', label: 'Excel 97–2003 (.xls)' },
  { format: 'ods', label: 'OpenDocument (.ods)' },
]

const tabFormats: Array<{ format: ExportFormat; label: string }> = [
  { format: 'csv', label: 'CSV (.csv)' },
  { format: 'tsv', label: 'Tab-separated (.tsv)' },
]

interface WorkbookFileActionsProps {
  handle: WorkbookHandle | null
  canEdit: boolean
  listName: string
  onNotice: (notice: string) => void
}

export function WorkbookFileActions({
  handle,
  canEdit,
  listName,
  onNotice,
}: WorkbookFileActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [tables, setTables] = useState<Array<ImportTable>>([])
  const [pendingImport, setPendingImport] = useState<{
    fileName: string
    sheets: Array<ImportedSheet>
  } | null>(null)
  const [dialogKey, setDialogKey] = useState(0)

  function sendToDatabase() {
    if (!handle) return
    const table = handle.getActiveTable()
    if (table.rows.length === 0) {
      onNotice('This tab has no rows under its header row.')
      return
    }
    setDialogKey((key) => key + 1)
    setTables([table])
  }

  function applyImport(fileName: string, sheets: Array<ImportedSheet>) {
    if (!handle) return
    const names = handle.replaceSheets(sheets)
    onNotice(
      `Replaced the list with ${names.length} ${names.length === 1 ? 'tab' : 'tabs'} from ${fileName}`,
    )
  }

  async function importFile(file: File) {
    if (!handle) return
    if (file.size > MAX_IMPORT_BYTES) {
      onNotice('That file is larger than 20 MB.')
      return
    }
    setBusy(true)
    try {
      const { readWorkbookFile } = await loadFileTools()
      const sheets = await readWorkbookFile(file)
      if (sheets.length === 0) {
        onNotice('That file has no sheets to import.')
        return
      }
      if (handle.hasContent()) {
        setPendingImport({ fileName: file.name, sheets })
      } else {
        applyImport(file.name, sheets)
      }
    } catch (error) {
      console.error('List import failed', error)
      onNotice(
        `Could not import that file: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      setBusy(false)
    }
  }

  async function download(format: ExportFormat) {
    if (!handle) return
    setBusy(true)
    try {
      const { writeWorkbookFile } = await loadFileTools()
      const { workbook, activeSheetId } = handle.getSnapshot()
      writeWorkbookFile(workbook, activeSheetId, format, listName)
    } catch (error) {
      console.error('List download failed', error)
      onNotice('Could not create the file. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importFile(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!handle || busy}
            aria-label="Import a file"
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            <span className="hidden md:inline">Import</span>
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!handle || busy}
        aria-label="Send this tab to the database"
        title="Send this tab to the database"
        onClick={sendToDatabase}
      >
        <DatabaseZap />
        <span className="hidden lg:inline">To database</span>
      </Button>
      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this list’s tabs?</AlertDialogTitle>
            <AlertDialogDescription>
              All current tabs and their data are replaced by the{' '}
              {pendingImport?.sheets.length === 1
                ? 'sheet'
                : `${pendingImport?.sheets.length ?? 0} sheets`}{' '}
              in {pendingImport?.fileName}. Use Download first if you want a
              copy of what’s here now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingImport) {
                  applyImport(pendingImport.fileName, pendingImport.sheets)
                }
                setPendingImport(null)
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DatabaseImportDialog
        key={dialogKey}
        tables={tables}
        onOpenChange={(open) => {
          if (!open) setTables([])
        }}
        onImported={(counts) =>
          onNotice(
            `Sent to database: ${counts.created} new, ${counts.filled} filled in, ${counts.unchanged} unchanged.`,
          )
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!handle || busy}
              aria-label="Download"
            />
          }
        >
          <Download />
          <span className="hidden md:inline">Download</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Whole list, all tabs</DropdownMenuLabel>
            {workbookFormats.map(({ format, label }) => (
              <DropdownMenuItem
                key={format}
                onClick={() => void download(format)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Current tab only</DropdownMenuLabel>
            {tabFormats.map(({ format, label }) => (
              <DropdownMenuItem
                key={format}
                onClick={() => void download(format)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
