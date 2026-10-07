import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { DatabaseImportDialog } from '@/components/database-import-dialog'
import { Button } from '@/components/ui/button'
import type { ImportCounts, ImportTable } from '@/lib/database-import'
import { TABLE_FILE_ACCEPT, readTables } from '@/lib/table-files'

const MAX_FILE_BYTES = 20 * 1024 * 1024

interface DatabaseImportButtonProps {
  onImported: (counts: ImportCounts) => void
  onError: (message: string) => void
}

export function DatabaseImportButton({
  onImported,
  onError,
}: DatabaseImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [tables, setTables] = useState<Array<ImportTable>>([])
  const [reading, setReading] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)

  async function openFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      onError('That file is larger than 20 MB.')
      return
    }
    setReading(true)
    try {
      const read = (await readTables(file)).filter(
        (table) => table.rows.length > 0,
      )
      if (read.length === 0) {
        onError('That file has no rows to import.')
        return
      }
      setDialogKey((key) => key + 1)
      setTables(read)
    } catch (error) {
      console.error('Database import failed to read the file', error)
      onError(
        `Could not read that file: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      setReading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={TABLE_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void openFile(file)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={reading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {reading ? 'Reading…' : 'Import'}
      </Button>
      <DatabaseImportDialog
        key={dialogKey}
        tables={tables}
        onOpenChange={(open) => {
          if (!open) setTables([])
        }}
        onImported={onImported}
      />
    </>
  )
}
