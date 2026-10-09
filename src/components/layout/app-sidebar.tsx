import { Link, useRouterState } from '@tanstack/react-router'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { NavItem } from '@/config/app'

interface AppSidebarProps {
  items: Array<NavItem>
}

const iconClass = '[&_svg]:size-5'

const activeClass = `${iconClass} data-active:bg-sidebar-foreground/10 data-active:text-foreground hover:bg-sidebar-foreground/10 dark:hover:bg-sidebar-accent dark:data-active:bg-sidebar-accent`

export function AppSidebar({ items }: AppSidebarProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <Sidebar collapsible="icon" className="top-14 h-[calc(100svh-3.5rem)]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ label, to, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    tooltip={label}
                    isActive={pathname === to || pathname.startsWith(`${to}/`)}
                    render={<Link to={to} />}
                    className={activeClass}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
