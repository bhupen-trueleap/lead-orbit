import {
  Clock,
  FolderOpen,
  History,
  LayoutDashboard,
  Search,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const appConfig = {
  name: 'LeadOrbit',
  userName: 'Bhupen',
}

export interface NavItem {
  label: string
  icon: LucideIcon
}

export const navItems: Array<NavItem> = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Searches', icon: Search },
  { label: 'Entities', icon: Users },
  { label: 'Collections', icon: FolderOpen },
  { label: 'Saved Searches', icon: Clock },
  { label: 'History', icon: History },
]
