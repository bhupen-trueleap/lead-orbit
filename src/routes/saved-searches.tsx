import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/saved-searches')({
  component: SavedSearches,
})

function SavedSearches() {
  return (
    <EmptyPage
      title="Saved Searches"
      description="No saved searches yet. Save a search to re-run it later."
    />
  )
}
