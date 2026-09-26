import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { PageSection } from '@/components/page-section'
import { RecentSearchCard } from '@/components/search/recent-search-card'
import { SearchBox } from '@/components/search/search-box'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchRecentSearches } from '@/lib/recent-searches'
import type { RecentSearch } from '@/lib/recent-searches'

export const Route = createFileRoute('/_app/')({ component: Home })

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
    <div className="mx-auto max-w-4xl space-y-10">
      <PageSection title="Search anything">
        <SearchBox
          placeholder="Find AI founders in India with 5k+ LinkedIn followers"
          onSearch={({ query, category, limit }) =>
            void navigate({
              to: '/searches',
              search: { q: query, category, limit },
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((search) => (
              <RecentSearchCard key={search.id} {...search} />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  )
}
