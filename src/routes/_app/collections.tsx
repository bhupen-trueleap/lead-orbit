import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/_app/collections')({
  component: Collections,
})

function Collections() {
  return (
    <EmptyPage description="No collections yet. Group entities into collections to organize them." />
  )
}
