import { CornerDownLeft, Search, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { DisclosureRow } from '@/components/disclosure-row'
import { NumberStepper } from '@/components/number-stepper'
import { SettingRow } from '@/components/setting-row'
import { SegmentedControl } from '@/components/segmented-control'
import {
  ColumnChecklist,
  ColumnPicker,
} from '@/components/search/column-picker'
import { OptionMenu } from '@/components/option-menu'
import { AgentCostDialog } from '@/components/search/agent-cost-dialog'
import { SEARCH_CATEGORIES, categoryLabels } from '@/lib/categories'
import type { MenuOption } from '@/components/option-menu'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { examplePrompts } from '@/config/app'
import type { ExamplePrompt } from '@/config/app'
import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_MODE,
  MAX_QUERY_LENGTH,
  MAX_SEARCH_LIMIT,
  MIN_SEARCH_LIMIT,
  isSearchCategory,
  SEARCH_MODES,
  searchModeHints,
  searchModeLabels,
  searchModeShortHints,
  clampSearchLimit,
} from '@/lib/search'
import type { SearchCategory, SearchMode, SearchRequest } from '@/lib/search'
import { RESULT_COUNTS } from '@/lib/pagination'
import { fetchColumns, presetColumnsFor } from '@/lib/columns'
import type { ColumnDef } from '@/lib/columns'
import {
  AGENT_EFFORTS,
  DEFAULT_AGENT_EFFORT,
  agentEffortLabels,
  agentEffortPrices,
  formatDollars,
} from '@/lib/agent'
import type { AgentEffort } from '@/lib/agent'

interface SearchBoxProps {
  placeholder?: string
  defaultQuery?: string
  defaultCategory?: SearchCategory
  defaultLimit?: number
  defaultColumns?: Array<string>
  defaultMode?: SearchMode
  defaultEffort?: AgentEffort
  layout?: 'inline' | 'panel'
  isSearching?: boolean
  confirmAgentRuns?: boolean
  confirmOnLoad?: boolean
  onSearch: (request: SearchRequest) => void
}

interface ResultTypeOption {
  label: string
  value: SearchCategory | undefined
}

const filters: Array<ResultTypeOption> = [
  { label: 'All', value: undefined },
  ...SEARCH_CATEGORIES.map((value) => ({
    label: categoryLabels[value],
    value,
  })),
]

const effortOptions: Array<MenuOption<AgentEffort>> = AGENT_EFFORTS.map(
  (value) => ({
    value,
    label: agentEffortLabels[value],
    hint: `${formatDollars(agentEffortPrices[value])} per run`,
  }),
)

const resultTypeOptions: Array<MenuOption<string>> = filters.map(
  ({ label, value }) => ({ label, value: value ?? 'all' }),
)

export function SearchBox({
  placeholder,
  defaultQuery,
  defaultCategory,
  defaultLimit = DEFAULT_SEARCH_LIMIT,
  defaultColumns,
  defaultMode = DEFAULT_SEARCH_MODE,
  defaultEffort = DEFAULT_AGENT_EFFORT,
  layout = 'inline',
  isSearching = false,
  confirmAgentRuns = true,
  confirmOnLoad = false,
  onSearch,
}: SearchBoxProps) {
  const [category, setCategory] = useState<SearchCategory | undefined>(
    defaultCategory,
  )

  const [limit, setLimit] = useState(clampSearchLimit(defaultLimit))
  const [mode, setMode] = useState<SearchMode>(defaultMode)
  const [effort, setEffort] = useState<AgentEffort>(defaultEffort)
  const [pending, setPending] = useState<SearchRequest | null>(null)
  const isAgent = mode === 'agent'
  const [columns, setColumns] = useState<Array<ColumnDef>>([])
  const [selectedColumns, setSelectedColumns] = useState<Array<string>>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialColumnsRef = useRef(defaultColumns)
  const initialCategoryRef = useRef(defaultCategory)
  const initialRequestRef = useRef(
    confirmOnLoad && defaultQuery
      ? {
          query: defaultQuery,
          category: defaultCategory,
          limit: clampSearchLimit(defaultLimit),
          mode: defaultMode,
          effort: defaultEffort,
        }
      : null,
  )

  useEffect(() => {
    let active = true
    fetchColumns()
      .then((list) => {
        if (!active || !list) return
        setColumns(list)
        const known = new Set(list.map((column) => column.id))
        const initial = (initialColumnsRef.current ?? []).filter((id) =>
          known.has(id),
        )
        const chosen =
          initial.length > 0
            ? initial
            : presetColumnsFor(list, initialCategoryRef.current).map(
                (column) => column.id,
              )
        setSelectedColumns(chosen)
        const initialRequest = initialRequestRef.current
        if (initialRequest) setPending({ ...initialRequest, columns: chosen })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const effortLabel = agentEffortLabels[effort]
  const categoryLabel =
    filters.find((filter) => filter.value === category)?.label ?? 'All'

  function changeCategory(next: SearchCategory | undefined) {
    setCategory(next)
    setSelectedColumns(
      presetColumnsFor(columns, next).map((column) => column.id),
    )
  }

  function applyExample(example: ExamplePrompt) {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.value = example.query
    textarea.focus()
    changeCategory(example.category)
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSearching) return
    const value = new FormData(event.currentTarget).get('query')
    const query = typeof value === 'string' ? value.trim() : ''
    if (!query) return
    const next = {
      query,
      category,
      limit,
      mode,
      effort,
      columns: selectedColumns,
    }
    if (isAgent && confirmAgentRuns) {
      setPending(next)
    } else {
      onSearch(next)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          name="query"
          rows={3}
          maxLength={MAX_QUERY_LENGTH}
          defaultValue={defaultQuery}
          aria-label="Search anything"
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          className={layout === 'panel' ? 'pb-12' : 'pr-14'}
        />
        {layout === 'panel' ? (
          <Button
            type="submit"
            size="sm"
            disabled={isSearching}
            className="absolute right-2 bottom-2"
          >
            Search
            <CornerDownLeft />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            aria-label="Search"
            disabled={isSearching}
            className="absolute right-2 bottom-2"
          >
            <Search />
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" />
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((example) => (
            <button
              key={example.query}
              type="button"
              onClick={() => applyExample(example)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              {example.query}
            </button>
          ))}
        </div>
      </div>
      {layout === 'panel' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Search depth</p>
            <SegmentedControl
              label="Search depth"
              options={SEARCH_MODES.map((value) => ({
                value,
                label: searchModeLabels[value],
                hint: searchModeShortHints[value],
              }))}
              value={mode}
              onChange={setMode}
            />
          </div>
          <div className="space-y-2">
            <DisclosureRow
              title="Outputs"
              summary={`${categoryLabel} · ${limit} ${limit === 1 ? 'result' : 'results'}${isAgent ? ` · ${agentEffortLabels[effort]}` : ''}`}
            >
              <div className="divide-y">
                <SettingRow
                  title="Result type"
                  description="What kind of results to find"
                >
                  <OptionMenu
                    label="Result type"
                    triggerLabel={categoryLabel}
                    triggerClassName="w-40 justify-between"
                    options={resultTypeOptions}
                    value={category ?? 'all'}
                    onChange={(value) =>
                      changeCategory(
                        isSearchCategory(value) ? value : undefined,
                      )
                    }
                  />
                </SettingRow>
                {isAgent ? (
                  <SettingRow
                    title="Effort"
                    description="More effort checks more sources"
                  >
                    <OptionMenu
                      label="Effort"
                      triggerLabel={effortLabel}
                      triggerClassName="w-40 justify-between"
                      options={effortOptions}
                      value={effort}
                      onChange={setEffort}
                    />
                  </SettingRow>
                ) : null}
                <SettingRow
                  title={isAgent ? 'List size' : 'Number of results'}
                  description={
                    isAgent
                      ? `Target, max ${MAX_SEARCH_LIMIT}.`
                      : `Max: ${MAX_SEARCH_LIMIT}.`
                  }
                >
                  <NumberStepper
                    label="Number of results"
                    value={limit}
                    min={MIN_SEARCH_LIMIT}
                    max={MAX_SEARCH_LIMIT}
                    onChange={setLimit}
                  />
                </SettingRow>
              </div>
            </DisclosureRow>
            <DisclosureRow
              title="Columns"
              summary={`${selectedColumns.length} chosen`}
            >
              <ColumnChecklist
                columns={columns}
                selectedIds={selectedColumns}
                category={category}
                onChange={setSelectedColumns}
                paidContacts={isAgent}
                onColumnCreated={(column) =>
                  setColumns((current) => [...current, column])
                }
              />
            </DisclosureRow>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <OptionMenu
            label="Result type"
            triggerLabel={categoryLabel}
            options={resultTypeOptions}
            value={category ?? 'all'}
            onChange={(value) =>
              changeCategory(isSearchCategory(value) ? value : undefined)
            }
          />
          <OptionMenu
            label="Number of results"
            triggerLabel={`${limit} ${limit === 1 ? 'result' : 'results'}`}
            options={RESULT_COUNTS.map((value) => ({
              value,
              label: `${value} results`,
            }))}
            value={limit}
            onChange={setLimit}
          />
          <OptionMenu
            label="Search depth"
            triggerLabel={searchModeLabels[mode]}
            options={SEARCH_MODES.map((value) => ({
              value,
              label: searchModeLabels[value],
              hint: searchModeHints[value],
            }))}
            value={mode}
            onChange={setMode}
          />
          {isAgent ? (
            <OptionMenu
              label="Effort"
              triggerLabel={`${effortLabel} effort`}
              options={effortOptions}
              value={effort}
              onChange={setEffort}
            />
          ) : null}
          <ColumnPicker
            columns={columns}
            selectedIds={selectedColumns}
            category={category}
            onChange={setSelectedColumns}
            paidContacts={isAgent}
            onColumnCreated={(column) =>
              setColumns((current) => [...current, column])
            }
          />
        </div>
      )}
      <AgentCostDialog
        request={pending}
        columns={columns}
        onCancel={() => setPending(null)}
        onConfirm={(request) => {
          setPending(null)
          onSearch(request)
        }}
      />
    </form>
  )
}
