import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { DatabaseImportButton } from '@/components/database-import-button'
import { EntityFilters } from '@/components/search/entity-filters'
import { ColumnPicker } from '@/components/search/column-picker'
import { EntityTable } from '@/components/search/entity-table'
import { TablePagination } from '@/components/table-pagination'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
  entitiesExportUrl,
  fetchEntities,
  parseEntityFilters,
} from '@/lib/entities'
import { fetchColumns, presetColumnsFor } from '@/lib/columns'
import type { ColumnDef } from '@/lib/columns'
import {
  RESULT_COUNTS,
  DEFAULT_PAGE_SIZE,
  isResultCount,
  isPage,
} from '@/lib/pagination'
import type { ResultCount } from '@/lib/pagination'
import type { EntitiesPage, EntityFilters as Filters } from '@/lib/entities'
import { requireAdmin } from '@/lib/viewer'

export const Route = createFileRoute('/_app/entities')({
  beforeLoad: requireAdmin,
  validateSearch: (
    search: Record<string, unknown>,
  ): Filters & { page?: number; pageSize?: ResultCount; show?: string } => ({
    ...parseEntityFilters(search),
    ...(typeof search.show === 'string' && SHOW_PATTERN.test(search.show)
      ? { show: search.show }
      : {}),
    ...(isPage(search.page) ? { page: search.page } : {}),
    ...(isResultCount(search.pageSize) ? { pageSize: search.pageSize } : {}),
  }),
  component: Entities,
})

const SHOW_PATTERN = /^[a-z0-9_]{1,48}(,[a-z0-9_]{1,48}){0,19}$/

type LoadState = 'loading' | 'ready' | 'error'

function Entities() {
  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    q,
    type,
    site,
    sort,
    addedFrom,
    addedTo,
    cols,
    show,
  } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [data, setData] = useState<EntitiesPage | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [columns, setColumns] = useState<Array<ColumnDef>>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const colsKey = cols ? JSON.stringify(cols) : ''

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

  const filters = useMemo<Filters>(
    () =>
      parseEntityFilters({
        q,
        type,
        site,
        sort,
        addedFrom,
        addedTo,
        cols: colsKey || undefined,
      }),
    [q, type, site, sort, addedFrom, addedTo, colsKey],
  )

  const filterColumns = useMemo(
    () =>
      columns.filter(
        (column) => column.scope === 'entity' && column.type !== 'boolean',
      ),
    [columns],
  )

  const tableColumns = useMemo(() => {
    const byKey = new Map(filterColumns.map((column) => [column.key, column]))
    const base = show
      ? show.split(',').flatMap((key) => {
          const column = byKey.get(key)
          return column ? [column] : []
        })
      : presetColumnsFor(filterColumns, undefined)
    const filtered = filterColumns.filter(
      (column) =>
        filters.cols?.[column.key] !== undefined && !base.includes(column),
    )
    return [...base, ...filtered]
  }, [filterColumns, show, filters.cols])

  const handleColumnsChange = useCallback(
    (ids: Array<string>) => {
      const next = filterColumns.filter((column) => ids.includes(column.id))
      const ordered = ids.flatMap((id) => {
        const column = next.find((item) => item.id === id)
        return column ? [column] : []
      })
      const visible = new Set(ordered.map((column) => column.key))
      const remaining = Object.fromEntries(
        Object.entries(filters.cols ?? {}).filter(([key]) => visible.has(key)),
      )
      void navigate({
        search: (prev) => ({
          ...prev,
          page: 1,
          show: ordered.map((column) => column.key).join(',') || undefined,
          cols: Object.keys(remaining).length > 0 ? remaining : undefined,
        }),
      })
    },
    [filterColumns, filters.cols, navigate],
  )

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    fetchEntities(page, pageSize, filters, controller.signal)
      .then((result) => {
        setData(result)
        setState(result ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [page, pageSize, filters, reloadKey])

  const isLoading = state === 'loading'
  const lastPage = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1

  useEffect(() => {
    if (state === 'ready' && page > lastPage) {
      void navigate({ search: (prev) => ({ ...prev, page: lastPage }) })
    }
  }, [state, page, lastPage, navigate])

  const handleFiltersChange = useCallback(
    (next: Filters) =>
      void navigate({ search: { ...next, page: 1, pageSize } }),
    [navigate, pageSize],
  )

  const entities = data?.entities ?? []
  const total = data?.total ?? 0
  const hasFilters = Boolean(q || type || site || addedFrom || addedTo)

  return (
    <div className="space-y-6">
      <EntityFilters
        filters={filters}
        types={data?.types ?? []}
        columns={tableColumns}
        onChange={handleFiltersChange}
        actions={
          <>
            <DatabaseImportButton
              onError={setNotice}
              onImported={(counts) => {
                setNotice(
                  `Imported: ${counts.created} new, ${counts.filled} filled in, ${counts.unchanged} unchanged.`,
                )
                setReloadKey((key) => key + 1)
              }}
            />
            {total > 0 ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={entitiesExportUrl(
                      filters,
                      tableColumns.map((column) => column.key),
                    )}
                    download
                  />
                }
              >
                <Download />
                Export CSV
              </Button>
            ) : null}
          </>
        }
        columnPicker={
          <ColumnPicker
            label="Columns"
            columns={filterColumns}
            selectedIds={tableColumns.map((column) => column.id)}
            category={undefined}
            onChange={handleColumnsChange}
          />
        }
      />

      <div aria-live="polite" className="text-sm text-muted-foreground">
        {notice ? <p>{notice}</p> : null}
        {state === 'error' ? 'Could not load the database.' : null}
        {state === 'ready' && total === 0
          ? hasFilters
            ? 'Nothing matches these filters.'
            : 'Nothing saved yet. Run a search to fill the database.'
          : null}
      </div>

      {entities.length > 0 || isLoading ? (
        <EntityTable
          entities={isLoading ? [] : entities}
          columns={tableColumns}
          isLoading={isLoading}
          startIndex={(page - 1) * pageSize}
        />
      ) : null}

      {total > 0 ? (
        <TablePagination
          page={page}
          pageSize={pageSize}
          pageSizes={RESULT_COUNTS}
          total={total}
          onPageChange={(next) =>
            void navigate({ search: (prev) => ({ ...prev, page: next }) })
          }
          onPageSizeChange={(size) =>
            void navigate({
              search: (prev) => ({ ...prev, page: 1, pageSize: size }),
            })
          }
        />
      ) : null}
    </div>
  )
}
