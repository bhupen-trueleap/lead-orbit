import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { EntityTable } from '@/components/search/entity-table'
import { SaveSearchButton } from '@/components/search/save-search-button'
import { SearchBox } from '@/components/search/search-box'
import { DEFAULT_SEARCH_LIMIT, isSearchCategory } from '@/lib/search'
import type { SearchCategory } from '@/lib/search'
import { useSearch } from '@/lib/use-search'
import { isResultCount } from '@/lib/pagination'
import type { ResultCount } from '@/lib/pagination'

export const Route = createFileRoute('/_app/searches')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; category?: SearchCategory; limit?: ResultCount } => ({
    ...(typeof search.q === 'string' ? { q: search.q } : {}),
    ...(isSearchCategory(search.category) ? { category: search.category } : {}),
    ...(isResultCount(search.limit) ? { limit: search.limit } : {}),
  }),
  component: Searches,
})

function Searches() {
  const { q, category, limit } = Route.useSearch()
  const { entities, status, message, request, search } = useSearch()
  const startedRef = useRef(false)

  useEffect(() => {
    if (q && !startedRef.current) {
      startedRef.current = true
      void search({
        query: q,
        category,
        limit: limit ?? DEFAULT_SEARCH_LIMIT,
      })
    }
  }, [q, category, limit, search])

  const isSearching = status === 'searching'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SearchBox
        placeholder="Describe who or what you are looking for, e.g. fintech founders in Singapore"
        defaultQuery={q}
        defaultCategory={category}
        defaultLimit={limit}
        isSearching={isSearching}
        onSearch={(next) => void search(next)}
      />

      <div className="flex items-center justify-between gap-4">
        <div aria-live="polite" className="text-sm text-muted-foreground">
          {isSearching ? 'Searching…' : null}
          {status === 'done' && entities.length === 0
            ? 'No results found.'
            : null}
          {message}
        </div>
        {request && !isSearching ? (
          <SaveSearchButton
            key={`${request.query}|${request.category}|${request.limit}`}
            request={request}
          />
        ) : null}
      </div>

      {entities.length > 0 || isSearching ? (
        <EntityTable entities={entities} isLoading={isSearching} />
      ) : null}
    </div>
  )
}
