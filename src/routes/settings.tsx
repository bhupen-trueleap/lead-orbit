import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/settings')({ component: Settings })

function Settings() {
  return (
    <EmptyPage
      title="Settings"
      description="Settings will be available here soon."
    />
  )
}
