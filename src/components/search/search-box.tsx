import { Search } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
    </form>
  )
}
