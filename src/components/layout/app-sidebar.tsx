import { Plus, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { NavItem } from '@/config/app'

interface AppSidebarProps {
  items: Array<NavItem>
  activeLabel?: string
}

export function AppSidebar({ items, activeLabel }: AppSidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
      <Button className="mb-4 justify-start">
        <Plus />
        New Search
      </Button>
      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map(({ label, icon: Icon }) => {
          const isActive = label === activeLabel
          return (
            <Button
              key={label}
              variant={isActive ? 'secondary' : 'ghost'}
              aria-current={isActive ? 'page' : undefined}
              className="justify-start"
            >
              <Icon />
              {label}
            </Button>
          )
        })}
      </nav>
      <Separator className="my-4" />
      <Button variant="ghost" className="justify-start">
        <Settings />
        Settings
      </Button>
    </aside>
  )
}
