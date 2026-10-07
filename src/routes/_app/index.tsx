import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { PageSection } from '@/components/page-section'
import { RecentSearchCard } from '@/components/search/recent-search-card'
import { SearchBox } from '@/components/search/search-box'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchRecentSearches } from '@/lib/recent-searches'
import { columnIdsToParam } from '@/lib/columns'
import type { RecentSearch } from '@/lib/recent-searches'
import { requireAdmin } from '@/lib/viewer'

export const Route = createFileRoute('/_app/')({
  beforeLoad: requireAdmin,
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const [recent, setRecent] = useState<Array<RecentSearch> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchRecentSearches(controller.signal)
      .then((items) => {
        setRecent(items ?? [])
        setFailed(items === null)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [])

  return (
    <div className="space-y-10">
      <PageSection title="Search anything">
        <SearchBox
          placeholder="Describe who or what you are looking for, e.g. fintech founders in Singapore"
          confirmAgentRuns={false}
          onSearch={({ query, category, limit, mode, effort, columns }) =>
            void navigate({
              to: '/searches',
              search: {
                q: query,
                category,
                limit,
                mode,
                ...(mode === 'agent' ? { effort } : {}),
                columns: columnIdsToParam(columns),
              },
            })
          }
        />
      </PageSection>

      <PageSection title="Recent searches">
        {failed ? (
          <p className="text-sm text-muted-foreground">
            Could not load recent searches.
          </p>
        ) : recent === null ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-28 rounded-xl motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No searches yet. Your recent searches will show up here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {recent.map((search) => (
              <RecentSearchCard key={search.id} {...search} />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  )
}
