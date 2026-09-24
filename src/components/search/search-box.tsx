import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface SearchBoxProps {
  placeholder?: string
  onSearch: (query: string) => void
}

export function SearchBox({ placeholder, onSearch }: SearchBoxProps) {
  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('query')
    const query = typeof value === 'string' ? value.trim() : ''
    if (query) onSearch(query)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        name="query"
        rows={3}
        maxLength={500}
        aria-label="Search anything"
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        className="pr-14"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Search"
        className="absolute right-2 bottom-2"
      >
        <Search />
      </Button>
    </form>
  )
}
