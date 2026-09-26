import { Clock, FolderOpen, LayoutDashboard, Search, Users } from 'lucide-react'
import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

export const appConfig = {
  name: 'LeadOrbit',
}

export interface NavItem {
  label: string
  to: LinkProps['to']
  icon: LucideIcon
}

export const navItems: Array<NavItem> = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Searches', to: '/searches', icon: Search },
  { label: 'Entities', to: '/entities', icon: Users },
  { label: 'Collections', to: '/collections', icon: FolderOpen },
  { label: 'Saved Searches', to: '/saved-searches', icon: Clock },
]

export interface ExamplePrompt {
  query: string
  category?: 'people' | 'company'
}

export const examplePrompts: Array<ExamplePrompt> = [
  { query: 'AI founders in India', category: 'people' },
  { query: 'Community builders in Houston', category: 'people' },
  { query: 'Series A fintech startups in Southeast Asia', category: 'company' },
  { query: 'Climate tech companies hiring engineers', category: 'company' },
  { query: 'Developer tools launched this year' },
]
