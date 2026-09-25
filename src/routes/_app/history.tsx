import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/_app/history')({ component: History })

function History() {
  return (
    <EmptyPage description="No history yet. Your past searches will be listed here." />
  )
}
