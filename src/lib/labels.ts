const entityTypeLabels: Partial<Record<string, { one: string; many: string }>> =
  {
    person: { one: 'Person', many: 'People' },
    company: { one: 'Company', many: 'Companies' },
    organization: { one: 'Organization', many: 'Organizations' },
    publication: { one: 'Publication', many: 'Publications' },
    page: { one: 'Page', many: 'Pages' },
    other: { one: 'Other', many: 'Other' },
  }

export function entityTypeLabel(type: string, form: 'one' | 'many'): string {
  const known = entityTypeLabels[type]
  if (known) return known[form]
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export { categoryLabels } from '@/lib/categories'
