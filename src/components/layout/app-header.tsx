import { Link } from '@tanstack/react-router'
import { Bell, ChevronDown, Orbit, Settings } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppHeaderProps {
  appName: string
  userName: string
}

export function AppHeader({ appName, userName }: AppHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-2 font-semibold">
        <Orbit className="size-5" />
        {appName}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>
        <Link
          to="/settings"
          aria-label="Settings"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <Settings />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" />}>
            {userName}
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
