import { Check, Columns3, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  MAX_COLUMNS_PER_SEARCH,
  MAX_COLUMN_INSTRUCTION_LENGTH,
  MAX_COLUMN_LABEL_LENGTH,
  columnTypeLabels,
  createColumn,
  presetColumnsFor,
} from '@/lib/columns'
import type { ColumnDef, ColumnType } from '@/lib/columns'
import type { SearchCategory } from '@/lib/search'
import { contactKindFor, contactPrices, formatDollars } from '@/lib/agent'

const COLUMN_TYPES: ReadonlyArray<ColumnType> = ['text', 'number', 'boolean']

interface ColumnPickerProps {
  columns: Array<ColumnDef>
  selectedIds: Array<string>
  category: SearchCategory | undefined
  onChange: (selectedIds: Array<string>) => void
  onColumnCreated?: (column: ColumnDef) => void
  paidContacts?: boolean
  label?: string
  triggerClassName?: string
}

function ColumnOption({
  column,
  selected,
  disabled,
  paid,
  onToggle,
}: {
  column: ColumnDef
  selected: boolean
  disabled: boolean
  paid: boolean
  onToggle: () => void
}) {
  const contact = paid ? contactKindFor(column.key) : null
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-sm border',
          selected && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
      <span className="flex-1 truncate">{column.label}</span>
      {contact ? (
        <span className="rounded-sm bg-amber-500/15 px-1.5 text-xs font-medium text-amber-700 tabular-nums dark:text-amber-400">
          {formatDollars(contactPrices[contact])} each
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {columnTypeLabels[column.type]}
        </span>
      )}
    </button>
  )
}

function NewColumnForm({
  category,
  onCreated,
}: {
  category: SearchCategory | undefined
  onCreated: (column: ColumnDef) => void
}) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<ColumnType>('text')
  const [instruction, setInstruction] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  async function handleCreate() {
    if (label.trim() === '') return
    setStatus('saving')
    try {
      const column = await createColumn({
        label,
        type,
        instruction,
        scope: type === 'boolean' ? 'search' : 'entity',
        category: category ?? null,
      })
      if (!column) {
        setStatus('error')
        return
      }
      onCreated(column)
      setLabel('')
      setInstruction('')
      setType('text')
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="space-y-2 border-t p-2">
      <p className="text-xs font-medium text-muted-foreground">New column</p>
      <Input
        value={label}
        maxLength={MAX_COLUMN_LABEL_LENGTH}
        aria-label="Column name"
        placeholder="e.g. Community name"
        onChange={(event) => setLabel(event.target.value)}
      />
      <div
        role="radiogroup"
        aria-label="Column type"
        className="flex flex-wrap gap-1.5"
      >
        {COLUMN_TYPES.map((value) => (
          <Button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            variant={type === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType(value)}
          >
            {columnTypeLabels[value]}
          </Button>
        ))}
      </div>
      <Input
        value={instruction}
        maxLength={MAX_COLUMN_INSTRUCTION_LENGTH}
        aria-label="What to extract"
        placeholder="What to extract (optional)"
        onChange={(event) => setInstruction(event.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {status === 'error' ? 'Could not create the column.' : null}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={label.trim() === '' || status === 'saving'}
          onClick={() => void handleCreate()}
        >
          <Plus />
          {status === 'saving' ? 'Adding…' : 'Add column'}
        </Button>
      </div>
    </div>
  )
}

type ColumnChecklistProps = Omit<
  ColumnPickerProps,
  'label' | 'triggerClassName'
>

export function ColumnChecklist({
  columns,
  selectedIds,
  category,
  onChange,
  onColumnCreated,
  paidContacts = false,
}: ColumnChecklistProps) {
  const selected = new Set(selectedIds)
  const atLimit = selectedIds.length >= MAX_COLUMNS_PER_SEARCH
  const presets = presetColumnsFor(columns, category)
  const others = columns.filter((column) => !presets.includes(column))

  function toggle(id: string) {
    onChange(
      selected.has(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    )
  }

  function renderGroup(title: string, list: Array<ColumnDef>) {
    if (list.length === 0) return null
    return (
      <div className="space-y-0.5 p-1.5">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
          {title}
        </p>
        {list.map((column) => (
          <ColumnOption
            key={column.id}
            column={column}
            selected={selected.has(column.id)}
            disabled={atLimit && !selected.has(column.id)}
            paid={paidContacts}
            onToggle={() => toggle(column.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="max-h-80 overflow-y-auto">
        {renderGroup('Suggested', presets)}
        {renderGroup('All columns', others)}
      </div>
      {atLimit ? (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          Up to {MAX_COLUMNS_PER_SEARCH} columns at a time.
        </p>
      ) : null}
      {onColumnCreated ? (
        <NewColumnForm
          category={category}
          onCreated={(column) => {
            onColumnCreated(column)
            if (!atLimit) onChange([...selectedIds, column.id])
          }}
        />
      ) : null}
    </>
  )
}

export function ColumnPicker({
  label = 'Columns',
  triggerClassName,
  ...checklist
}: ColumnPickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={triggerClassName}
          />
        }
      >
        <Columns3 />
        {label}
        <span className="rounded-sm bg-muted px-1.5 text-xs text-foreground">
          {checklist.selectedIds.length}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] p-0"
      >
        <ColumnChecklist {...checklist} />
      </PopoverContent>
    </Popover>
  )
}
