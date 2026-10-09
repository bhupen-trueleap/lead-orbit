import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageCrumbProvider } from '@/components/layout/page-crumb'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { appConfig, navItems } from '@/config/app'
import { isAdmin } from '@/lib/viewer'
import type { Viewer } from '@/lib/viewer'

interface AppShellProps {
  children: React.ReactNode
  defaultOpen: boolean
  viewer: Viewer
}

export function AppShell({ children, defaultOpen, viewer }: AppShellProps) {
  const admin = isAdmin(viewer)
  const items = admin ? navItems : navItems.filter((item) => !item.adminOnly)

  return (
    <TooltipProvider>
      <PageCrumbProvider>
        <SidebarProvider defaultOpen={defaultOpen} className="h-svh flex-col">
          <AppHeader appName={appConfig.name} email={viewer.email} />
          <div className="flex min-h-0 flex-1">
            <AppSidebar items={items} />
            <SidebarInset className="min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-10 motion-reduce:scroll-auto">
                {children}
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </PageCrumbProvider>
    </TooltipProvider>
  )
}
