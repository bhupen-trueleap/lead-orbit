import { Plus, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  SheetValue,
  WorkbookHandle,
} from '@/components/lists/list-workbook'
import { AgentProgress } from '@/components/search/agent-progress'
import { SearchBox } from '@/components/search/search-box'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { createColumn, fetchColumns } from '@/lib/columns'
import type { ColumnDef, FieldValue } from '@/lib/columns'
import { entityTypeLabel } from '@/lib/labels'
import { useSearch } from '@/lib/use-search'

const NAME_HEADERS = ['name', 'full name', 'lead', 'person']
const URL_HEADERS = [
  'linkedin or website',
  'url',
  'link',
  'profile',
  'website or linkedin',
]
const DEFAULT_NAME_HEADER = 'Name'
const DEFAULT_URL_HEADER = 'LinkedIn or website'

const normalize = (value: string) => value.trim().toLowerCase()

function toSheetValue(value: FieldValue | undefined): SheetValue | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value
}

interface HeaderPlan {
  nameHeader: string | undefined
  urlHeader: string | undefined
  matched: Map<string, string>
  unmatched: Array<string>
}

function planHeaders(
  headers: Array<string>,
  columns: Array<ColumnDef>,
): HeaderPlan {
  const byLabel = new Map(
    columns
      .filter((column) => column.scope === 'entity')
      .map((column) => [normalize(column.label), column]),
  )
  const matched = new Map<string, string>()
  const unmatched: Array<string> = []
  let nameHeader: string | undefined
  let urlHeader: string | undefined
  for (const header of headers) {
    const key = normalize(header)
    if (key === '') continue
    const column = byLabel.get(key)
    if (column) {
      matched.set(column.id, header)
    } else if (!nameHeader && NAME_HEADERS.includes(key)) {
      nameHeader = header
    } else if (!urlHeader && URL_HEADERS.includes(key)) {
      urlHeader = header
    } else {
      unmatched.push(header)
    }
  }
  return { nameHeader, urlHeader, matched, unmatched }
}

interface ListSearchPanelProps {
  handle: WorkbookHandle | null
  canEdit: boolean
  onClose: () => void
}

export function ListSearchPanel({
  handle,
  canEdit,
  onClose,
}: ListSearchPanelProps) {
  const [columns, setColumns] = useState<Array<ColumnDef>>([])
  const [headers, setHeaders] = useState<Array<string>>([])
  const [chosenUnmatched, setChosenUnmatched] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [boxKey, setBoxKey] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const {
    entities,
    columns: resultColumns,
    status,
    message: searchMessage,
    agent,
    startedAt,
    search,
  } = useSearch()

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

  function readHeaders() {
    setHeaders(handle?.getHeaders() ?? [])
    setChosenUnmatched(new Set())
    setBoxKey((key) => key + 1)
  }

  useEffect(() => {
    setHeaders(handle?.getHeaders() ?? [])
  }, [handle])

  const plan = useMemo(() => planHeaders(headers, columns), [headers, columns])
  const defaultColumns = useMemo(() => [...plan.matched.keys()], [plan])
  const ready = columns.length > 0
  const isSearching = status === 'searching'

  async function createChosen() {
    setCreating(true)
    setMessage(null)
    const created = await Promise.all(
      [...chosenUnmatched].map((label) =>
        createColumn({
          label,
          type: 'text',
          instruction: `The ${label} of this person or company`,
          scope: 'entity',
          category: null,
        }).catch(() => null),
      ),
    )
    setCreating(false)
    const added = created.flatMap((column) => (column ? [column] : []))
    if (added.length < chosenUnmatched.size) {
      setMessage('Some columns could not be created. Try again.')
    }
    setColumns((current) => [
      ...current,
      ...added.filter(
        (column) => !current.some((item) => item.id === column.id),
      ),
    ])
    setChosenUnmatched(new Set())
    setBoxKey((key) => key + 1)
  }

  function addToSheet() {
    if (!handle) return
    const picked =
      selected.size > 0
        ? entities.filter((entity) => selected.has(entity.id))
        : entities
    const nameHeader = plan.nameHeader ?? DEFAULT_NAME_HEADER
    const urlHeader = plan.urlHeader ?? DEFAULT_URL_HEADER
    const rows = picked.map((entity) => {
      const row: Record<string, SheetValue> = { [nameHeader]: entity.name }
      if (entity.url) row[urlHeader] = entity.url
      for (const column of resultColumns) {
        const value = toSheetValue(entity.values[column.key])
        if (value === undefined) continue
        row[plan.matched.get(column.id) ?? column.label] = value
      }
      return row
    })
    const result = handle.appendRows(rows, urlHeader)
    setSelected(new Set())
    setMessage(
      `Added ${result.added} ${result.added === 1 ? 'row' : 'rows'} to ${result.sheetName}` +
        (result.skipped > 0 ? `, ${result.skipped} already there.` : '.'),
    )
  }

  const allSelected = entities.length > 0 && selected.size === entities.length

  return (
    <aside
      aria-label="Search"
      className="flex h-full min-h-0 flex-col border-l bg-background"
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h2 className="text-sm font-medium">Search</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close search"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">Columns from this tab’s header row</p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={readHeaders}
              disabled={!handle}
            >
              <RefreshCw />
              Re-read
            </Button>
          </div>
          {headers.length === 0 ? (
            <p className="text-muted-foreground">
              This tab has no header row yet. Results will add one.
            </p>
          ) : (
            <p className="text-muted-foreground">
              {plan.matched.size > 0
                ? `Searching for: ${[...plan.matched.values()].join(', ')}.`
                : 'No header matches a search column yet.'}
            </p>
          )}
          {plan.unmatched.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Not searched yet. Tick the ones the web should fill in:
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {plan.unmatched.map((header) => (
                  <label
                    key={header}
                    className="flex items-center gap-2 text-foreground"
                  >
                    <Checkbox
                      checked={chosenUnmatched.has(header)}
                      onCheckedChange={(checked) =>
                        setChosenUnmatched((current) => {
                          const next = new Set(current)
                          if (checked) next.add(header)
                          else next.delete(header)
                          return next
                        })
                      }
                    />
                    {header}
                  </label>
                ))}
              </div>
              {chosenUnmatched.size > 0 ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={creating}
                  onClick={() => void createChosen()}
                >
                  <Plus />
                  {creating
                    ? 'Adding…'
                    : `Search for ${chosenUnmatched.size} more`}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {ready ? (
          <SearchBox
            key={boxKey}
            layout="panel"
            placeholder="Describe who you are looking for"
            defaultColumns={defaultColumns}
            keepColumnsOnTypeChange
            isSearching={isSearching}
            onSearch={(request) => {
              setSelected(new Set())
              setMessage(null)
              void search(request)
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        <div aria-live="polite" className="space-y-1 text-sm empty:hidden">
          {isSearching && agent && startedAt !== null ? (
            <AgentProgress status={agent.status} startedAt={startedAt} />
          ) : isSearching ? (
            <p className="text-muted-foreground">Searching…</p>
          ) : null}
          {searchMessage ? (
            <p className="text-muted-foreground">{searchMessage}</p>
          ) : null}
          {status === 'done' && entities.length === 0 ? (
            <p className="text-muted-foreground">No results found.</p>
          ) : null}
        </div>

        {entities.length > 0 ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={allSelected}
                indeterminate={selected.size > 0 && !allSelected}
                onCheckedChange={(checked) =>
                  setSelected(
                    checked
                      ? new Set(entities.map((entity) => entity.id))
                      : new Set(),
                  )
                }
              />
              {entities.length} {entities.length === 1 ? 'result' : 'results'}
            </label>
            <ul className="divide-y rounded-lg border">
              {entities.map((entity) => (
                <li key={entity.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50">
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.has(entity.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) => {
                          const next = new Set(current)
                          if (checked) next.add(entity.id)
                          else next.delete(entity.id)
                          return next
                        })
                      }
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block truncate text-sm font-medium">
                        {entity.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[
                          entity.role,
                          entity.location,
                          entityTypeLabel(entity.type, 'one'),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {canEdit && (entities.length > 0 || message) ? (
        <div className="shrink-0 space-y-2 border-t p-3">
          {message ? (
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {message}
            </p>
          ) : null}
          {entities.length > 0 && !isSearching ? (
            <Button
              type="button"
              className="w-full"
              disabled={!handle}
              onClick={addToSheet}
            >
              <Plus />
              {selected.size > 0
                ? `Add ${selected.size} to the sheet`
                : `Add all ${entities.length} to the sheet`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}
