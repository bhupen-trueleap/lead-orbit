import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { getSidebarOpen } from '@/server/sidebar'
import { loadViewer } from '@/server/viewer'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const viewer = await loadViewer()
    if (!viewer) throw redirect({ to: '/login' })
    return { viewer }
  },
  loader: () => getSidebarOpen(),
  staleTime: Infinity,
  component: AppLayout,
})

function AppLayout() {
  const defaultOpen = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()

  return (
    <AppShell defaultOpen={defaultOpen} viewer={viewer}>
      <Outlet />
    </AppShell>
  )
}
