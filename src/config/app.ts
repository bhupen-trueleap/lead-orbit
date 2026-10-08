import {
  Database,
  FolderOpen,
  LayoutDashboard,
  List,
  Search,
  Users,
} from 'lucide-react'
import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

import type { SearchCategory } from '@/lib/search'

export const appConfig = {
  name: 'LeadOrbit',
}

export interface NavItem {
  label: string
  to: LinkProps['to']
  icon: LucideIcon
  adminOnly?: boolean
}

export const navItems: Array<NavItem> = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, adminOnly: true },
  { label: 'Searches', to: '/searches', icon: Search, adminOnly: true },
  { label: 'Database', to: '/entities', icon: Database, adminOnly: true },
  {
    label: 'Collections',
    to: '/collections',
    icon: FolderOpen,
    adminOnly: true,
  },
  { label: 'Lists', to: '/lists', icon: List },
  { label: 'People', to: '/people', icon: Users, adminOnly: true },
]

export interface ExamplePrompt {
  query: string
  category?: SearchCategory
}

export const examplePrompts: Array<ExamplePrompt> = [
  { query: 'AI founders in India', category: 'people' },
  { query: 'Community builders in Houston', category: 'people' },
  { query: 'Series A fintech startups in Southeast Asia', category: 'company' },
  { query: 'Climate tech companies hiring engineers', category: 'company' },
  { query: 'Developer tools launched this year' },
]
