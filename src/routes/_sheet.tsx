import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { TooltipProvider } from '@/components/ui/tooltip'
import { loadViewer } from '@/server/viewer'

export const Route = createFileRoute('/_sheet')({
  beforeLoad: async () => {
    const viewer = await loadViewer()
    if (!viewer) throw redirect({ to: '/login' })
    return { viewer }
  },
  component: SheetLayout,
})

function SheetLayout() {
  return (
    <TooltipProvider>
      <Outlet />
    </TooltipProvider>
  )
}
