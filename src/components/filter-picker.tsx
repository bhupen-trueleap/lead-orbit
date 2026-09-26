import { Check, ChevronRight, ListFilter, X } from 'lucide-react'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface FilterOption {
  label: string
  value: string
}

interface BaseField {
  key: string
  label: string
  icon: LucideIcon
}

export interface OptionsField extends BaseField {
  kind: 'options'
  options: Array<FilterOption>
}

export interface RangeField extends BaseField {
  kind: 'range'
  inputType: 'number' | 'date'
  min?: number
  max?: number
}

export type FilterField = OptionsField | RangeField

export type FilterValues = Partial<Record<string, string>>

const RANGE_EDGES: ReadonlyArray<'from' | 'to'> = ['from', 'to']

export function rangeKeys(key: string): { from: string; to: string } {
  return { from: `${key}From`, to: `${key}To` }
}

interface FilterPickerProps {
  fields: Array<FilterField>
  values: FilterValues
  onChange: (changes: FilterValues) => void
}

function isFieldActive(field: FilterField, values: FilterValues): boolean {
  if (field.kind === 'options') return values[field.key] !== undefined
  const { from, to } = rangeKeys(field.key)
  return values[from] !== undefined || values[to] !== undefined
}

function chipLabel(field: FilterField, values: FilterValues): string | null {
  if (field.kind === 'options') {
    return (
      field.options.find((option) => option.value === values[field.key])
        ?.label ?? null
    )
  }
  const { from, to } = rangeKeys(field.key)
  const start = values[from]
  const end = values[to]
  if (start && end) return `${start} – ${end}`
  if (start) return `from ${start}`
  if (end) return `until ${end}`
  return null
}

function OptionsPanel({
  field,
  values,
  onChange,
}: {
  field: OptionsField
  values: FilterValues
  onChange: FilterPickerProps['onChange']
}) {
  if (field.options.length === 0) {
    return <p className="p-2 text-xs text-muted-foreground">No options yet</p>
  }

  return (
    <div role="radiogroup" aria-label={field.label} className="space-y-0.5">
      {field.options.map((option) => {
        const selected = values[field.key] === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() =>
              onChange({ [field.key]: selected ? undefined : option.value })
            }
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex-1 truncate">{option.label}</span>
            {selected ? <Check className="size-4 shrink-0" /> : null}
          </button>
        )
      })}
    </div>
  )
}

function RangePanel({
  field,
  values,
  onChange,
}: {
  field: RangeField
  values: FilterValues
  onChange: FilterPickerProps['onChange']
}) {
  const keys = rangeKeys(field.key)

  function commit(key: string, raw: string) {
    const value = raw.trim() || undefined
    if (value !== values[key]) onChange({ [key]: value })
  }

  return (
    <div className="space-y-3 p-1">
      {RANGE_EDGES.map((edge) => {
        const key = keys[edge]
        return (
          <label key={key} className="block space-y-1">
            <span className="text-xs text-muted-foreground">
              {edge === 'from' ? 'From' : 'To'}
            </span>
            <Input
              key={values[key] ?? ''}
              type={field.inputType}
              min={field.min}
              max={field.max}
              defaultValue={values[key] ?? ''}
              onBlur={(event) => commit(key, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commit(key, event.currentTarget.value)
                }
              }}
            />
          </label>
        )
      })}
    </div>
  )
}

export function FilterPicker({ fields, values, onChange }: FilterPickerProps) {
  const [activeKey, setActiveKey] = useState(fields.at(0)?.key)
  const activeField = fields.find((field) => field.key === activeKey)
  const activeCount = fields.filter((field) =>
    isFieldActive(field, values),
  ).length

  function clearField(field: FilterField) {
    if (field.kind === 'options') {
      onChange({ [field.key]: undefined })
    } else {
      const { from, to } = rangeKeys(field.key)
      onChange({ [from]: undefined, [to]: undefined })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" />}>
          <ListFilter />
          Filter
          {activeCount > 0 ? (
            <span className="rounded-sm bg-primary px-1.5 text-xs text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[26rem] max-w-[calc(100vw-2rem)] p-0"
        >
          <div className="flex min-h-48">
            <nav
              aria-label="Filter fields"
              className="w-40 shrink-0 space-y-0.5 border-r p-1.5"
            >
              {fields.map((field) => {
                const Icon = field.icon
                const isActive = field.key === activeKey
                return (
                  <button
                    key={field.key}
                    type="button"
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => setActiveKey(field.key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                      isActive && 'bg-muted font-medium',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{field.label}</span>
                    {isFieldActive(field, values) ? (
                      <span
                        aria-label="Active"
                        className="size-1.5 rounded-full bg-primary"
                      />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </nav>
            <div className="min-w-0 flex-1 p-1.5">
              {activeField?.kind === 'options' ? (
                <OptionsPanel
                  field={activeField}
                  values={values}
                  onChange={onChange}
                />
              ) : null}
              {activeField?.kind === 'range' ? (
                <RangePanel
                  field={activeField}
                  values={values}
                  onChange={onChange}
                />
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {fields.map((field) => {
        const label = chipLabel(field, values)
        if (!label) return null
        return (
          <span
            key={field.key}
            className="inline-flex h-7 items-center gap-1 rounded-md border bg-muted/40 pr-1 pl-2.5 text-xs"
          >
            <span className="text-muted-foreground">{field.label}:</span>
            <span className="font-medium">{label}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${field.label} filter`}
              onClick={() => clearField(field)}
            >
              <X />
            </Button>
          </span>
        )
      })}
    </div>
  )
}
