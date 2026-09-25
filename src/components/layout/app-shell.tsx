import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { appConfig, navItems } from '@/config/app'

interface AppShellProps {
  children: React.ReactNode
  defaultOpen: boolean
}

export function AppShell({ children, defaultOpen }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen} className="h-svh flex-col">
        <AppHeader appName={appConfig.name} />
        <div className="flex min-h-0 flex-1">
          <AppSidebar items={navItems} />
          <SidebarInset className="min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-10">{children}</div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
