import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'

const SEARCH_DEBOUNCE_MS = 300

interface DebouncedSearchInputProps {
  value: string | undefined
  label: string
  placeholder: string
  maxLength: number
  onChange: (value: string | undefined) => void
}

export function DebouncedSearchInput({
  value,
  label,
  placeholder,
  maxLength,
  onChange,
}: DebouncedSearchInputProps) {
  const [text, setText] = useState(value ?? '')
  const sentRef = useRef(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (value !== sentRef.current) {
      sentRef.current = value
      setText(value ?? '')
    }
  }, [value])

  useEffect(() => {
    const next = text.trim() || undefined
    if (next === value) return
    const timer = setTimeout(() => {
      sentRef.current = next
      onChangeRef.current(next)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={text}
        maxLength={maxLength}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        className="pl-9"
      />
    </div>
  )
}
