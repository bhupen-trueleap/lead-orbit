import { ArrowUpDown, CalendarDays, Globe, Search, Tag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { FilterPicker } from '@/components/filter-picker'
import type { FilterField, FilterValues } from '@/components/filter-picker'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { MAX_ENTITY_QUERY_LENGTH, parseEntityFilters } from '@/lib/entities'
import type {
  EntityFilters as Filters,
  EntitySite,
  EntitySort,
  EntityTypeCount,
} from '@/lib/entities'

const SEARCH_DEBOUNCE_MS = 300

const typeLabels: Record<string, string> = {
  person: 'People',
  company: 'Companies',
  organization: 'Organizations',
  other: 'Other',
}

const siteOptions: Array<{ label: string; value: EntitySite }> = [
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Other sites', value: 'other' },
]

const sortOptions: Array<{ label: string; value: EntitySort }> = [
  { label: 'Recent', value: 'recent' },
  { label: 'Name A–Z', value: 'name' },
]

interface EntityFiltersProps {
  filters: Filters
  types: Array<EntityTypeCount>
  onChange: (filters: Filters) => void
}

export function EntityFilters({
  filters,
  types,
  onChange,
}: EntityFiltersProps) {
  const [query, setQuery] = useState(filters.q ?? '')
  const sentQueryRef = useRef(filters.q)

  useEffect(() => {
    if (filters.q !== sentQueryRef.current) {
      sentQueryRef.current = filters.q
      setQuery(filters.q ?? '')
    }
  }, [filters.q])

  useEffect(() => {
    const next = query.trim() || undefined
    if (next === filters.q) return
    const timer = setTimeout(() => {
      sentQueryRef.current = next
      onChange({ ...filters, q: next })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, filters, onChange])

  const fields: Array<FilterField> = [
    {
      kind: 'options',
      key: 'type',
      label: 'Type',
      icon: Tag,
      options: types.map(({ type, count }) => ({
        label: `${typeLabels[type] ?? type} (${count})`,
        value: type,
      })),
    },
    {
      kind: 'options',
      key: 'site',
      label: 'Site',
      icon: Globe,
      options: siteOptions,
    },
    {
      kind: 'range',
      key: 'added',
      label: 'Date added',
      icon: CalendarDays,
      inputType: 'date',
    },
  ]

  function handleFilterChange(changes: FilterValues) {
    onChange(parseEntityFilters({ ...filters, ...changes }))
  }

  const sort = filters.sort ?? 'recent'
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label
  const hasFilters = Boolean(
    filters.q ||
    filters.type ||
    filters.site ||
    filters.addedFrom ||
    filters.addedTo,
  )

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          maxLength={MAX_ENTITY_QUERY_LENGTH}
          aria-label="Search entities"
          placeholder="Search by name, URL or details"
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterPicker
          fields={fields}
          values={{
            type: filters.type,
            site: filters.site,
            addedFrom: filters.addedFrom,
            addedTo: filters.addedTo,
          }}
          onChange={handleFilterChange}
        />
        <div className="flex items-center gap-2">
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                sentQueryRef.current = undefined
                setQuery('')
                onChange({ sort: filters.sort })
              }}
            >
              <X />
              Clear
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <ArrowUpDown />
              {sortLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() =>
                    onChange({
                      ...filters,
                      sort:
                        option.value === 'recent' ? undefined : option.value,
                    })
                  }
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
