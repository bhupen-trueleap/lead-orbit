import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Tag, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { DebouncedSearchInput } from '@/components/debounced-search-input'
import { FilterPicker } from '@/components/filter-picker'
import type { FilterField, FilterValues } from '@/components/filter-picker'
import { SavedSearchesTable } from '@/components/search/saved-searches-table'
import { TablePagination } from '@/components/table-pagination'
import { Button } from '@/components/ui/button'
import {
  MAX_SAVED_QUERY_LENGTH,
  deleteSavedSearch,
  fetchSavedSearches,
  parseSavedSearchFilters,
} from '@/lib/saved-searches'
import type {
  SavedSearchFilters,
  SavedSearchesPage,
} from '@/lib/saved-searches'
import {
  RESULT_COUNTS,
  DEFAULT_PAGE_SIZE,
  isResultCount,
  isPage,
} from '@/lib/pagination'
import type { ResultCount } from '@/lib/pagination'

export const Route = createFileRoute('/_app/saved-searches')({
  validateSearch: (
    search: Record<string, unknown>,
  ): SavedSearchFilters & { page?: number; pageSize?: ResultCount } => ({
    ...parseSavedSearchFilters(search),
    ...(isPage(search.page) ? { page: search.page } : {}),
    ...(isResultCount(search.pageSize) ? { pageSize: search.pageSize } : {}),
  }),
  component: SavedSearches,
})

type LoadState = 'loading' | 'ready' | 'error'

const filterFields: Array<FilterField> = [
  {
    kind: 'options',
    key: 'category',
    label: 'Type',
    icon: Tag,
    options: [
      { label: 'People', value: 'people' },
      { label: 'Companies', value: 'company' },
    ],
  },
]

function SavedSearches() {
  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    q,
    category,
  } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [data, setData] = useState<SavedSearchesPage | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const filters = useMemo(
    () => parseSavedSearchFilters({ q, category }),
    [q, category],
  )

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    fetchSavedSearches(page, pageSize, filters, controller.signal)
      .then((result) => {
        setData(result)
        setState(result ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [page, pageSize, filters, reloadKey])

  const lastPage = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1

  useEffect(() => {
    if (state === 'ready' && page > lastPage) {
      void navigate({ search: (prev) => ({ ...prev, page: lastPage }) })
    }
  }, [state, page, lastPage, navigate])

  const applyFilters = useCallback(
    (next: SavedSearchFilters) =>
      void navigate({ search: { ...next, page: 1, pageSize } }),
    [navigate, pageSize],
  )

  async function handleDelete(id: string) {
    setMessage(null)
    try {
      if (await deleteSavedSearch(id)) {
        setReloadKey((key) => key + 1)
        return
      }
    } catch {
      // handled below
    }
    setMessage('Could not delete the saved search. Please try again.')
  }

  const savedSearches = data?.savedSearches ?? []
  const total = data?.total ?? 0
  const hasFilters = Boolean(q || category)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3">
        <DebouncedSearchInput
          value={filters.q}
          label="Search saved searches"
          placeholder="Search saved searches"
          maxLength={MAX_SAVED_QUERY_LENGTH}
          onChange={(nextQuery) => applyFilters({ ...filters, q: nextQuery })}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterPicker
            fields={filterFields}
            values={{ category: filters.category }}
            onChange={(changes: FilterValues) =>
              applyFilters(parseSavedSearchFilters({ ...filters, ...changes }))
            }
          />
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyFilters({})}
            >
              <X />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div aria-live="polite" className="text-sm text-muted-foreground">
        {state === 'loading' && !data ? 'Loading…' : null}
        {state === 'error' ? 'Could not load saved searches.' : null}
        {state === 'ready' && total === 0
          ? hasFilters
            ? 'No saved searches match these filters.'
            : 'No saved searches yet. Save a search from the Searches page.'
          : null}
        {message}
      </div>

      {savedSearches.length > 0 ? (
        <SavedSearchesTable
          savedSearches={savedSearches}
          onDelete={(id) => void handleDelete(id)}
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
