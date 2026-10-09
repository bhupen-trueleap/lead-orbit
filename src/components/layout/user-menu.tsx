import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'

interface UserMenuProps {
  email: string
}

export function UserMenu({ email }: UserMenuProps) {
  async function signOut() {
    await authClient.signOut()
    window.location.assign('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Account: ${email}`}
            className="mr-3 rounded-full bg-primary text-sm font-medium text-primary-foreground uppercase hover:bg-primary/80 hover:text-primary-foreground aria-expanded:bg-primary/80 aria-expanded:text-primary-foreground"
          />
        }
      >
        {email.charAt(0)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
