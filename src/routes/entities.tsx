import { createFileRoute } from '@tanstack/react-router'

import { EmptyPage } from '@/components/empty-page'

export const Route = createFileRoute('/entities')({ component: Entities })

function Entities() {
  return (
    <EmptyPage
      title="Entities"
      description="No entities yet. People and companies you discover will appear here."
    />
  )
}
