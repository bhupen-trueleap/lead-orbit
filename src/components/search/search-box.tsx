import { Search, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { examplePrompts } from '@/config/app'
import type { ExamplePrompt } from '@/config/app'
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_QUERY_LENGTH,
  SEARCH_LIMITS,
} from '@/lib/search'
import type { SearchCategory, SearchLimit, SearchRequest } from '@/lib/search'

interface SearchBoxProps {
  placeholder?: string
  defaultQuery?: string
  defaultCategory?: SearchCategory
  defaultLimit?: SearchLimit
  isSearching?: boolean
  onSearch: (request: SearchRequest) => void
}

const filters: Array<{ label: string; value: SearchCategory | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'People', value: 'people' },
  { label: 'Companies', value: 'company' },
]

export function SearchBox({
  placeholder,
  defaultQuery,
  defaultCategory,
  defaultLimit = DEFAULT_SEARCH_LIMIT,
  isSearching = false,
  onSearch,
}: SearchBoxProps) {
  const [category, setCategory] = useState<SearchCategory | undefined>(
    defaultCategory,
  )

  const [limit, setLimit] = useState<SearchLimit>(defaultLimit)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function applyExample(example: ExamplePrompt) {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.value = example.query
    textarea.focus()
    setCategory(example.category)
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSearching) return
    const value = new FormData(event.currentTarget).get('query')
    const query = typeof value === 'string' ? value.trim() : ''
    if (query) onSearch({ query, category, limit })
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
          className="pr-14"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Search"
          disabled={isSearching}
          className="absolute right-2 bottom-2"
        >
          <Search />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div
          role="radiogroup"
          aria-label="Filter results"
          className="flex gap-2"
        >
          {filters.map(({ label, value }) => (
            <Button
              key={label}
              type="button"
              role="radio"
              aria-checked={category === value}
              variant={category === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div
          role="radiogroup"
          aria-label="Number of results"
          className="flex items-center gap-2"
        >
          {SEARCH_LIMITS.map((value) => (
            <Button
              key={value}
              type="button"
              role="radio"
              aria-checked={limit === value}
              variant={limit === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLimit(value)}
            >
              {value}
            </Button>
          ))}
        </div>
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
    </form>
  )
}
