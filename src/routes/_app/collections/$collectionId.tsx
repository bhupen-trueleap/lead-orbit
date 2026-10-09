import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Download, FolderMinus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePageCrumb } from '@/components/layout/page-crumb'
import { ColumnPicker } from '@/components/search/column-picker'
import { EntityFilters } from '@/components/search/entity-filters'
import { EntityTable } from '@/components/search/entity-table'
import { TablePagination } from '@/components/table-pagination'
import { Button } from '@/components/ui/button'
import {
  collectionExportUrl,
  fetchCollectionPage,
  removeCollectionItems,
} from '@/lib/collections'
import type { CollectionPage } from '@/lib/collections'
import { fetchColumns, presetColumnsFor } from '@/lib/columns'
import type { ColumnDef } from '@/lib/columns'
import { parseEntityFilters } from '@/lib/entities'
import type { EntityFilters as Filters } from '@/lib/entities'
import {
  DEFAULT_PAGE_SIZE,
  RESULT_COUNTS,
  isPage,
  isResultCount,
} from '@/lib/pagination'
import type { ResultCount } from '@/lib/pagination'
import { requireAdmin } from '@/lib/viewer'

const SHOW_PATTERN = /^[a-z0-9_]{1,48}(,[a-z0-9_]{1,48}){0,19}$/

export const Route = createFileRoute('/_app/collections/$collectionId')({
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
  component: CollectionDetail,
})

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

function CollectionDetail() {
  const { collectionId } = Route.useParams()
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
  const [data, setData] = useState<CollectionPage | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [columns, setColumns] = useState<Array<ColumnDef>>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
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

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    fetchCollectionPage(
      collectionId,
      page,
      pageSize,
      filters,
      controller.signal,
    )
      .then((result) => {
        if (result === 'missing') {
          setState('missing')
          return
        }
        setData(result)
        setState(result ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [collectionId, page, pageSize, filters, reloadKey])

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
      const ordered = ids.flatMap((id) => {
        const column = filterColumns.find((item) => item.id === id)
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

  const handleFiltersChange = useCallback(
    (next: Filters) => {
      setSelectedIds(new Set())
      void navigate({ search: { ...next, show, page: 1, pageSize } })
    },
    [navigate, show, pageSize],
  )

  const total = data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (state === 'ready' && page > lastPage) {
      void navigate({ search: (prev) => ({ ...prev, page: lastPage }) })
    }
  }, [state, page, lastPage, navigate])

  async function handleRemove() {
    const ids = [...selectedIds]
    setMessage(null)
    try {
      if (await removeCollectionItems(collectionId, ids)) {
        setSelectedIds(new Set())
        setReloadKey((key) => key + 1)
        return
      }
    } catch {
      // handled below
    }
    setMessage('Could not remove the selected items. Please try again.')
  }

  usePageCrumb(
    state === 'missing' ? 'Not found' : (data?.collection.name ?? 'Loading…'),
  )

  if (state === 'missing') {
    return (
      <p className="text-sm text-muted-foreground">
        This collection no longer exists.
      </p>
    )
  }

  const isLoading = state === 'loading'
  const entities = data?.entities ?? []
  const itemCount = data?.collection.itemCount ?? 0
  const hasFilters = Boolean(q || type || site || addedFrom || addedTo || cols)

  return (
    <div className="space-y-6">
      {data ? (
        <p className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
      ) : null}

      <EntityFilters
        filters={filters}
        types={data?.types ?? []}
        columns={tableColumns}
        searchLabel="Search this collection"
        recentLabel="Recently added"
        onChange={handleFiltersChange}
        actions={
          <>
            {selectedIds.size > 0 ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void handleRemove()}
              >
                <FolderMinus />
                Remove {selectedIds.size}
              </Button>
            ) : null}
            {total > 0 ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={collectionExportUrl(
                      collectionId,
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

      <div
        aria-live="polite"
        className="text-sm text-muted-foreground empty:hidden"
      >
        {state === 'error' ? 'Could not load this collection.' : null}
        {state === 'ready' && total === 0
          ? hasFilters
            ? 'Nothing in this collection matches these filters.'
            : 'This collection is empty. Add results to it from the Searches page.'
          : null}
        {message}
      </div>

      {entities.length > 0 || isLoading ? (
        <EntityTable
          entities={isLoading ? [] : entities}
          columns={tableColumns}
          isLoading={isLoading}
          startIndex={(page - 1) * pageSize}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
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
