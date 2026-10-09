import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, Orbit } from 'lucide-react'
import { cn } from 'cn'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { navItems } from '@/config/app'
import { useCurrentCrumb } from '@/components/layout/page-crumb'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'

interface AppHeaderProps {
  appName: string
  email: string
}

export function AppHeader({ appName, email }: AppHeaderProps) {
  const { state } = useSidebar()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const crumb = useCurrentCrumb()
  const section = navItems.find(
    (item) => item.to === pathname || pathname.startsWith(`${item.to}/`),
  )
  const collapsed = state === 'collapsed'

  return (
    <header className="flex h-14 shrink-0 items-center border-b">
      <div
        className={cn(
          'group/brand relative hidden h-full shrink-0 items-center border-r bg-sidebar px-2 transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex',
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
          <Orbit className="size-5 shrink-0 text-primary" />
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
      {section && crumb ? (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-1 items-center gap-2 px-4 text-base font-normal"
        >
          <Link
            to={section.to}
            className="shrink-0 rounded-sm text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {section.label}
          </Link>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          <h1 aria-current="page" className="min-w-0 truncate">
            {crumb}
          </h1>
        </nav>
      ) : (
        <h1 className="min-w-0 flex-1 truncate px-4 text-base font-normal">
          {section?.label ?? appName}
        </h1>
      )}
      <ThemeToggle />
      <UserMenu email={email} />
    </header>
  )
}
