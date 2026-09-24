import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import type { NavItem } from '@/config/app'

interface AppSidebarProps {
  items: Array<NavItem>
}

const linkClass = buttonVariants({ variant: 'ghost' }) + ' justify-start'
const activeClass = {
  className: 'bg-primary/15 font-medium text-foreground hover:bg-primary/20',
}

export function AppSidebar({ items }: AppSidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
      <Link to="/searches" className={buttonVariants() + ' mb-4 justify-start'}>
        <Plus />
        New Search
      </Link>
      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            activeProps={activeClass}
            className={linkClass}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
