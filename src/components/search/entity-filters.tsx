import {
  ArrowUpDown,
  CalendarDays,
  Globe,
  Hash,
  Tag,
  Type,
  X,
} from 'lucide-react'

import { DebouncedSearchInput } from '@/components/debounced-search-input'
import { FilterPicker } from '@/components/filter-picker'
import type { FilterField, FilterValues } from '@/components/filter-picker'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MAX_ENTITY_QUERY_LENGTH, parseEntityFilters } from '@/lib/entities'
import type {
  ColumnFilter,
  ColumnFilters,
  EntityFilters as Filters,
  EntitySite,
  EntitySort,
  EntityTypeCount,
} from '@/lib/entities'
import { entityTypeLabel } from '@/lib/labels'
import type { ColumnDef } from '@/lib/columns'

const siteOptions: Array<{ label: string; value: EntitySite }> = [
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Other sites', value: 'other' },
]

interface EntityFiltersProps {
  filters: Filters
  types: Array<EntityTypeCount>
  columns: Array<ColumnDef>
  columnPicker?: React.ReactNode
  actions?: React.ReactNode
  searchLabel?: string
  recentLabel?: string
  onChange: (filters: Filters) => void
}

const fieldKey = (columnKey: string) => `col_${columnKey}`

function columnField(column: ColumnDef): FilterField {
  return column.type === 'number'
    ? {
        kind: 'range',
        key: fieldKey(column.key),
        label: column.label,
        icon: Hash,
        inputType: 'number',
      }
    : {
        kind: 'text',
        key: fieldKey(column.key),
        label: column.label,
        icon: Type,
        placeholder: `e.g. ${column.label.toLowerCase()}`,
      }
}

function columnValues(
  columns: Array<ColumnDef>,
  cols: ColumnFilters | undefined,
): FilterValues {
  const values: FilterValues = {}
  for (const column of columns) {
    const filter = cols?.[column.key]
    if (!filter) continue
    const key = fieldKey(column.key)
    if (filter.contains !== undefined) values[key] = filter.contains
    if (filter.from !== undefined) values[`${key}From`] = String(filter.from)
    if (filter.to !== undefined) values[`${key}To`] = String(filter.to)
  }
  return values
}

function nextColumnFilters(
  columns: Array<ColumnDef>,
  cols: ColumnFilters | undefined,
  changes: FilterValues,
): ColumnFilters {
  const next: ColumnFilters = { ...cols }
  for (const column of columns) {
    const key = fieldKey(column.key)
    const touched = [key, `${key}From`, `${key}To`].some((name) =>
      Object.hasOwn(changes, name),
    )
    if (!touched) continue
    const current: ColumnFilter = { ...next[column.key] }
    if (Object.hasOwn(changes, key)) current.contains = changes[key]
    if (Object.hasOwn(changes, `${key}From`)) {
      const value = changes[`${key}From`]
      current.from = value === undefined ? undefined : Number(value)
    }
    if (Object.hasOwn(changes, `${key}To`)) {
      const value = changes[`${key}To`]
      current.to = value === undefined ? undefined : Number(value)
    }
    next[column.key] = current
  }
  return next
}

export function EntityFilters({
  filters,
  types,
  columns,
  columnPicker,
  actions,
  searchLabel = 'Search the database',
  recentLabel = 'Recent',
  onChange,
}: EntityFiltersProps) {
  const fields: Array<FilterField> = [
    {
      kind: 'options',
      key: 'type',
      label: 'Type',
      icon: Tag,
      options: types.map(({ type, count }) => ({
        label: `${entityTypeLabel(type, 'many')} (${count})`,
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
    ...columns.map(columnField),
  ]

  function handleFilterChange(changes: FilterValues) {
    onChange(
      parseEntityFilters({
        ...filters,
        ...changes,
        cols: nextColumnFilters(columns, filters.cols, changes),
      }),
    )
  }

  const sortOptions: Array<{ label: string; value: EntitySort }> = [
    { label: recentLabel, value: 'recent' },
    { label: 'Name A–Z', value: 'name' },
  ]
  const sort = filters.sort ?? 'recent'
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label
  const hasFilters = Boolean(
    filters.q ||
    filters.type ||
    filters.site ||
    filters.addedFrom ||
    filters.addedTo ||
    filters.cols,
  )

  return (
    <div className="space-y-3">
      <DebouncedSearchInput
        value={filters.q}
        label={searchLabel}
        placeholder="Search by name, URL, or any column value"
        maxLength={MAX_ENTITY_QUERY_LENGTH}
        onChange={(q) => onChange({ ...filters, q })}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {columnPicker}
          <FilterPicker
            fields={fields}
            values={{
              type: filters.type,
              site: filters.site,
              addedFrom: filters.addedFrom,
              addedTo: filters.addedTo,
              ...columnValues(columns, filters.cols),
            }}
            onChange={handleFilterChange}
          />
        </div>
        <div className="flex items-center gap-2">
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ sort: filters.sort })}
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
            <DropdownMenuContent align="end" className="w-44">
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
          {actions}
        </div>
      </div>
    </div>
  )
}
