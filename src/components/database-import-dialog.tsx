import { useEffect, useMemo, useState } from 'react'

import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { createColumn, fetchColumns } from '@/lib/columns'
import type { ColumnDef } from '@/lib/columns'
import {
  IMPORT_BATCH_SIZE,
  MAX_IMPORT_ROWS,
  columnIdOf,
  columnTarget,
  inferColumnType,
  prepareImport,
  sendImportBatch,
  suggestTargets,
} from '@/lib/database-import'
import type {
  ImportCounts,
  ImportTable,
  ImportTarget,
  TypeChoice,
} from '@/lib/database-import'

type Step = 'map' | 'importing' | 'done'

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

interface DatabaseImportDialogProps {
  tables: Array<ImportTable>
  onOpenChange: (open: boolean) => void
  onImported?: (counts: ImportCounts) => void
}

export function DatabaseImportDialog({
  tables,
  onOpenChange,
  onImported,
}: DatabaseImportDialogProps) {
  const [tableIndex, setTableIndex] = useState(0)
  const [columns, setColumns] = useState<Array<ColumnDef>>([])
  const [targets, setTargets] = useState<Array<ImportTarget>>([])
  const [typeChoice, setTypeChoice] = useState<TypeChoice>('detect')
  const [step, setStep] = useState<Step>('map')
  const [progress, setProgress] = useState(0)
  const [counts, setCounts] = useState<ImportCounts | null>(null)
  const [error, setError] = useState<string | null>(null)

  const table = tables.at(tableIndex)
  const open = tables.length > 0

  useEffect(() => {
    let active = true
    fetchColumns()
      .then((list) => {
        if (active && list) setColumns(list)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setTargets(table ? suggestTargets(table.headers, columns) : [])
  }, [table, columns])

  const entityColumns = useMemo(
    () => columns.filter((column) => column.scope === 'entity'),
    [columns],
  )

  const preview = useMemo(() => {
    if (!table) return null
    const existing = new Map<number, string>()
    for (const [index, target] of targets.entries()) {
      const id = columnIdOf(target)
      if (id) existing.set(index, id)
    }
    return prepareImport(table, targets, existing)
  }, [table, targets])

  const hasName = targets.includes('name')
  const hasUrl = targets.includes('url')
  const tooMany = (table?.rows.length ?? 0) > MAX_IMPORT_ROWS
  const canImport =
    hasName && hasUrl && !tooMany && (preview?.rows.length ?? 0) > 0

  function setTarget(index: number, target: ImportTarget) {
    setTargets((current) =>
      current.map((value, position) => {
        if (position === index) return target
        const unique =
          target === 'name' || target === 'url' || target === 'type'
        return unique && value === target ? 'ignore' : value
      }),
    )
  }

  async function runImport() {
    if (!table) return
    setStep('importing')
    setError(null)
    setProgress(0)
    try {
      const columnIds = new Map<number, string>()
      for (const [index, target] of targets.entries()) {
        const id = columnIdOf(target)
        if (id) {
          columnIds.set(index, id)
          continue
        }
        if (target !== 'new') continue
        const label = table.headers[index] ?? ''
        const created = await createColumn({
          label,
          type: inferColumnType(table.rows.map((row) => row[index] ?? null)),
          instruction: `Imported from a spreadsheet: ${label}`,
          scope: 'entity',
          category: null,
        })
        if (!created) throw new Error(`Could not create the column “${label}”.`)
        columnIds.set(index, created.id)
      }

      const prepared = prepareImport(table, targets, columnIds)
      const total: ImportCounts = { created: 0, filled: 0, unchanged: 0 }
      for (
        let start = 0;
        start < prepared.rows.length;
        start += IMPORT_BATCH_SIZE
      ) {
        const batch = prepared.rows.slice(start, start + IMPORT_BATCH_SIZE)
        const result = await sendImportBatch(batch, typeChoice)
        if (!result) {
          throw new Error(
            `Stopped after ${start} rows: the server could not import the next batch.`,
          )
        }
        total.created += result.created
        total.filled += result.filled
        total.unchanged += result.unchanged
        setProgress(Math.min(prepared.rows.length, start + batch.length))
      }
      setCounts(total)
      setStep('done')
      onImported?.(total)
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The import failed. Please try again.',
      )
      setStep('map')
    }
  }

  const sample = (index: number) =>
    table?.rows
      .map((row) => row[index])
      .find((value) => value !== null && String(value).trim() !== '')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (step !== 'importing') onOpenChange(next)
      }}
    >
      <DialogContent size="wide">
        <div className="space-y-1">
          <DialogTitle>Import into the database</DialogTitle>
          <DialogDescription>
            Each row becomes a lead, matched by its LinkedIn or website URL.
            Leads already in the database keep their data; only empty fields are
            filled in.
          </DialogDescription>
        </div>

        {step === 'done' && counts && preview ? (
          <div className="space-y-3 text-sm">
            <ul className="space-y-1">
              <li>{plural(counts.created, 'new lead', 'new leads')} added</li>
              <li>
                {plural(counts.filled, 'existing lead', 'existing leads')} had
                empty fields filled in
              </li>
              <li>
                {plural(counts.unchanged, 'existing lead', 'existing leads')}{' '}
                already had everything
              </li>
            </ul>
            <SkippedSummary preview={preview} />
            <div className="flex justify-end">
              <DialogClose render={<Button type="button" />}>Done</DialogClose>
            </div>
          </div>
        ) : table && preview ? (
          <div className="space-y-4">
            {tables.length > 1 ? (
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Sheet</span>
                <select
                  className={selectClass}
                  value={tableIndex}
                  disabled={step === 'importing'}
                  onChange={(event) =>
                    setTableIndex(Number(event.target.value))
                  }
                >
                  {tables.map((item, index) => (
                    <option key={item.name} value={index}>
                      {item.name} ({plural(item.rows.length, 'row', 'rows')})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="space-y-1.5">
              <p className="text-sm font-medium">These rows are</p>
              <SegmentedControl
                label="Lead type"
                value={typeChoice}
                options={[
                  { value: 'detect', label: 'Detect from URL' },
                  { value: 'person', label: 'People' },
                  { value: 'company', label: 'Companies' },
                ]}
                onChange={setTypeChoice}
              />
              <p className="text-xs text-muted-foreground">
                Detect treats LinkedIn profile links as people and everything
                else as companies. A Type column, if mapped, wins.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-normal">
                      Spreadsheet column
                    </th>
                    <th className="hidden px-3 py-2 font-normal sm:table-cell">
                      Example
                    </th>
                    <th className="px-3 py-2 font-normal">Import as</th>
                  </tr>
                </thead>
                <tbody>
                  {table.headers.map((header, index) => (
                    <tr key={`${header}-${index}`} className="border-t">
                      <td className="max-w-40 truncate px-3 py-2 font-medium">
                        {header || `Column ${index + 1}`}
                      </td>
                      <td className="hidden max-w-48 truncate px-3 py-2 text-muted-foreground sm:table-cell">
                        {String(sample(index) ?? '—')}
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          aria-label={`Import ${header || `column ${index + 1}`} as`}
                          className={selectClass}
                          value={targets[index] ?? 'ignore'}
                          disabled={step === 'importing'}
                          onChange={(event) =>
                            setTarget(index, event.target.value)
                          }
                        >
                          <option value="ignore">Don’t import</option>
                          <option value="name">Name</option>
                          <option value="url">LinkedIn or website URL</option>
                          <option value="type">Type (person or company)</option>
                          {header ? (
                            <option value="new">New column “{header}”</option>
                          ) : null}
                          <optgroup label="Existing columns">
                            {entityColumns.map((column) => (
                              <option
                                key={column.id}
                                value={columnTarget(column.id)}
                              >
                                {column.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div aria-live="polite" className="space-y-1 text-sm">
              {!hasName || !hasUrl ? (
                <p className="text-destructive">
                  Choose which column is the Name and which is the LinkedIn or
                  website URL.
                </p>
              ) : tooMany ? (
                <p className="text-destructive">
                  This sheet has more than{' '}
                  {MAX_IMPORT_ROWS.toLocaleString('en')} rows. Split it into
                  smaller files.
                </p>
              ) : (
                <p>
                  {plural(preview.rows.length, 'row', 'rows')} ready to import.
                </p>
              )}
              <SkippedSummary preview={preview} />
              {step === 'importing' ? (
                <p className="text-muted-foreground">
                  Importing… {progress} of {preview.rows.length}
                </p>
              ) : null}
              {error ? <p className="text-destructive">{error}</p> : null}
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose
                render={<Button type="button" variant="outline" />}
                disabled={step === 'importing'}
              >
                Cancel
              </DialogClose>
              <Button
                type="button"
                disabled={!canImport || step === 'importing'}
                onClick={() => void runImport()}
              >
                {step === 'importing'
                  ? 'Importing…'
                  : `Import ${plural(preview.rows.length, 'row', 'rows')}`}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SkippedSummary({
  preview,
}: {
  preview: NonNullable<ReturnType<typeof prepareImport>>
}) {
  const parts = [
    preview.skippedNoUrl > 0
      ? plural(preview.skippedNoUrl, 'row has', 'rows have') + ' no URL'
      : null,
    preview.skippedInvalidUrl > 0
      ? plural(preview.skippedInvalidUrl, 'row has', 'rows have') +
        ' an invalid URL'
      : null,
    preview.skippedNoName > 0
      ? plural(preview.skippedNoName, 'row has', 'rows have') + ' no name'
      : null,
    preview.duplicateInFile > 0
      ? plural(preview.duplicateInFile, 'row repeats', 'rows repeat') +
        ' a URL already in the file'
      : null,
  ].filter((part) => part !== null)
  if (parts.length === 0) return null
  return <p className="text-muted-foreground">Skipped: {parts.join('; ')}.</p>
}
