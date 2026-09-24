import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RecentSearch } from '@/lib/placeholder-data'

export function RecentSearchCard({ query, results, when }: RecentSearch) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{query}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{results} results</p>
        <p>{when}</p>
      </CardContent>
    </Card>
  )
}
