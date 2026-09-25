import { Link, useRouterState } from '@tanstack/react-router'
import { Orbit } from 'lucide-react'
import { cn } from 'cn'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { navItems } from '@/config/app'

interface AppHeaderProps {
  appName: string
}

export function AppHeader({ appName }: AppHeaderProps) {
  const { state } = useSidebar()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const title = navItems.find((item) => item.to === pathname)?.label ?? appName
  const collapsed = state === 'collapsed'

  return (
    <header className="flex h-14 shrink-0 items-center border-b">
      <div
        className={cn(
          'group/brand relative hidden h-full shrink-0 items-center border-r px-2 transition-[width] duration-200 ease-linear md:flex',
          collapsed ? 'w-(--sidebar-width-icon)' : 'w-(--sidebar-width)',
        )}
      >
        <Link
          to="/"
          aria-label={appName}
          className={cn(
            'flex h-8 items-center gap-2 rounded-md px-2 font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'group-hover/brand:opacity-0',
          )}
        >
          <Orbit className="size-5 shrink-0" />
          {collapsed ? null : <span className="truncate">{appName}</span>}
        </Link>
        <SidebarTrigger
          className={cn(
            collapsed
              ? 'absolute inset-y-0 left-2 my-auto size-8 opacity-0 group-hover/brand:opacity-100 focus-visible:opacity-100'
              : 'ml-auto',
          )}
        />
      </div>
      <SidebarTrigger className="ml-4 md:hidden" />
      <h1 className="truncate px-4 text-base font-semibold">{title}</h1>
    </header>
  )
}
