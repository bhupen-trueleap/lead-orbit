import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { PageSection } from '@/components/page-section'
import { RecentSearchCard } from '@/components/search/recent-search-card'
import { SearchBox } from '@/components/search/search-box'
import { StatCard } from '@/components/stat-card'
import { recentSearches } from '@/lib/placeholder-data'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <AppShell activeNav="Dashboard">
      <div className="mx-auto max-w-4xl space-y-10">
        <PageSection title="Search anything">
          <SearchBox
            placeholder="Find AI founders in India with 5k+ LinkedIn followers"
            onSearch={() => undefined}
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
    </AppShell>
  )
}
