import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/collections')({ component: Collections })

function Collections() {
  return (
    <EmptyPage
      title="Collections"
      description="No collections yet. Group entities into collections to organize them."
    />
  )
}
