import { Link, useRouterState } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

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

const activeClass = `${iconClass} data-active:bg-primary/15 data-active:text-foreground hover:bg-primary/20`

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="New Search"
                  render={<Link to="/searches" />}
                  className={`${iconClass} mb-2 bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground`}
                >
                  <Plus />
                  <span>New Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {items.map(({ label, to, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    tooltip={label}
                    isActive={pathname === to}
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
