import { Link } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/recent-searches'
import type { RecentSearch } from '@/lib/recent-searches'

const categoryLabels = { people: 'People', company: 'Companies' }

export function RecentSearchCard({
  query,
  category,
  results,
  createdAt,
}: RecentSearch) {
  return (
    <Link
      to="/searches"
      search={{ q: query, category: category ?? undefined }}
      className="block rounded-xl outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="line-clamp-2">{query}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0.5 text-sm text-muted-foreground">
          <p>
            {results} {results === 1 ? 'result' : 'results'}
            {category ? ` · ${categoryLabels[category]}` : ''}
          </p>
          <p>
            <time
              dateTime={createdAt}
              title={new Date(createdAt).toLocaleString()}
            >
              {formatRelativeTime(createdAt)}
            </time>
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
