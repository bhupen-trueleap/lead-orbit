import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { PageSection } from '@/components/page-section'
import { RecentSearchCard } from '@/components/search/recent-search-card'
import { SearchBox } from '@/components/search/search-box'
import { StatCard } from '@/components/stat-card'
import { recentSearches } from '@/lib/placeholder-data'

export const Route = createFileRoute('/_app/')({ component: Home })

function Home() {
  const navigate = useNavigate()

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
        <div className="grid gap-4 sm:grid-cols-2">
          {recentSearches.map((search) => (
            <RecentSearchCard key={search.id} {...search} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Recent discoveries">
        <StatCard
          title="24 new entities discovered today"
          detail="12 people · 8 companies · 4 organizations"
        />
      </PageSection>
    </div>
  )
}
