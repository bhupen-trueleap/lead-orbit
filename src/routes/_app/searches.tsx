import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { EntityTable } from '@/components/search/entity-table'
import { SaveSearchButton } from '@/components/search/save-search-button'
import { SearchBox } from '@/components/search/search-box'
import {
  DEFAULT_SEARCH_LIMIT,
  isSearchCategory,
  isSearchLimit,
} from '@/lib/search'
import type { SearchCategory, SearchLimit } from '@/lib/search'
import { useSearch } from '@/lib/use-search'

export const Route = createFileRoute('/_app/searches')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; category?: SearchCategory; limit?: SearchLimit } => ({
    ...(typeof search.q === 'string' ? { q: search.q } : {}),
    ...(isSearchCategory(search.category) ? { category: search.category } : {}),
    ...(isSearchLimit(search.limit) ? { limit: search.limit } : {}),
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
        placeholder="Find AI founders in India with 5k+ LinkedIn followers"
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
