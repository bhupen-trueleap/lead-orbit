import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/history')({ component: History })

function History() {
  return (
    <EmptyPage
      title="History"
      description="No history yet. Your past searches will be listed here."
    />
  )
}
