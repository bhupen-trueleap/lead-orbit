export type SearchCategory =
  | 'people'
  | 'company'
  | 'news'
  | 'publication'
  | 'personal_site'
  | 'financial_report'

export const SEARCH_CATEGORIES: ReadonlyArray<SearchCategory> = [
  'people',
  'company',
  'news',
  'publication',
  'personal_site',
  'financial_report',
]

export function isSearchCategory(value: unknown): value is SearchCategory {
  return SEARCH_CATEGORIES.some((category) => category === value)
}

export const categoryLabels: Record<SearchCategory, string> = {
  people: 'People',
  company: 'Companies',
  news: 'News',
  publication: 'Publications',
  personal_site: 'Personal sites',
  financial_report: 'Financial reports',
}

export const exaCategoryNames: Record<SearchCategory, string> = {
  people: 'people',
  company: 'company',
  news: 'news',
  publication: 'publication',
  personal_site: 'personal site',
  financial_report: 'financial report',
}
