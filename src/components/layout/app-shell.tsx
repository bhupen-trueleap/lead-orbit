import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { appConfig, navItems } from '@/config/app'

interface AppShellProps {
  children: React.ReactNode
  activeNav?: string
}

export function AppShell({ children, activeNav }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader appName={appConfig.name} userName={appConfig.userName} />
      <div className="flex flex-1">
        <AppSidebar items={navItems} activeLabel={activeNav} />
        <main className="min-w-0 flex-1 p-4 md:p-10">{children}</main>
      </div>
    </div>
  )
}
