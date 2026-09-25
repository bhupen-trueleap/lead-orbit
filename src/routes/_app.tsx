import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { getSidebarOpen } from '@/server/sidebar'

export const Route = createFileRoute('/_app')({
  loader: () => getSidebarOpen(),
  staleTime: Infinity,
  component: AppLayout,
})

function AppLayout() {
  const defaultOpen = Route.useLoaderData()

  return (
    <AppShell defaultOpen={defaultOpen}>
      <Outlet />
    </AppShell>
  )
}
