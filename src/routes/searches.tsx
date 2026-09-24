import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/searches')({ component: Searches })

function Searches() {
  return (
    <EmptyPage
      title="Searches"
      description="No searches yet. Start a new search to see it here."
    />
  )
}
