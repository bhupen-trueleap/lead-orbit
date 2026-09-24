export interface RecentSearch {
  id: string
  query: string
  results: number
  when: string
}

export const recentSearches: Array<RecentSearch> = [
  {
    id: 'ai-founders-india',
    query: 'AI founders India',
    results: 42,
    when: '2 hours ago',
  },
  {
    id: 'saas-us',
    query: 'SaaS companies in US',
    results: 128,
    when: 'Yesterday',
  },
]
