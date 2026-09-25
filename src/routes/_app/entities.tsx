import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { EntityTable } from '@/components/search/entity-table'
import { TablePagination } from '@/components/table-pagination'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  fetchEntities,
  isPage,
  isPageSize,
} from '@/lib/entities'
import type { EntitiesPage, PageSize } from '@/lib/entities'

export const Route = createFileRoute('/_app/entities')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { page?: number; pageSize?: PageSize } => ({
    ...(isPage(search.page) ? { page: search.page } : {}),
    ...(isPageSize(search.pageSize) ? { pageSize: search.pageSize } : {}),
  }),
  component: Entities,
})

type LoadState = 'loading' | 'ready' | 'error'

function Entities() {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [data, setData] = useState<EntitiesPage | null>(null)
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    fetchEntities(page, pageSize, controller.signal)
      .then((result) => {
        setData(result)
        setState(result ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [page, pageSize])

  const isLoading = state === 'loading'
  const lastPage = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1

  useEffect(() => {
    if (state === 'ready' && page > lastPage) {
      void navigate({ search: (prev) => ({ ...prev, page: lastPage }) })
    }
  }, [state, page, lastPage, navigate])

  const entities = data?.entities ?? []
  const total = data?.total ?? 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div aria-live="polite" className="text-sm text-muted-foreground">
        {state === 'error' ? 'Could not load entities.' : null}
        {state === 'ready' && total === 0
          ? 'Nothing saved yet. Run a search to add entities.'
          : null}
      </div>

      {entities.length > 0 || isLoading ? (
        <EntityTable
          entities={isLoading ? [] : entities}
          isLoading={isLoading}
          startIndex={(page - 1) * pageSize}
          showSource={false}
        />
      ) : null}

      {total > 0 ? (
        <TablePagination
          page={page}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          total={total}
          onPageChange={(next) =>
            void navigate({ search: (prev) => ({ ...prev, page: next }) })
          }
          onPageSizeChange={(size) =>
            void navigate({ search: { page: 1, pageSize: size } })
          }
        />
      ) : null}
    </div>
  )
}
