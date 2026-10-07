import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'

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

const NO_SWIPE_BACK = ['overscroll-x-none']

function SheetLayout() {
  useEffect(() => {
    const roots = [document.documentElement, document.body]
    for (const root of roots) root.classList.add(...NO_SWIPE_BACK)
    return () => {
      for (const root of roots) root.classList.remove(...NO_SWIPE_BACK)
    }
  }, [])

  return (
    <TooltipProvider>
      <div className="overscroll-x-none">
        <Outlet />
      </div>
    </TooltipProvider>
  )
}
