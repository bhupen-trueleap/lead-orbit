import { useCallback, useRef, useState } from 'react'

import { parseSearchEvent } from '@/lib/search'
import type { SearchEntity, SearchRequest } from '@/lib/search'

export type SearchStatus = 'idle' | 'searching' | 'done' | 'error'

export function useSearch() {
  const [entities, setEntities] = useState<Array<SearchEntity>>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [request, setRequest] = useState<SearchRequest | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const search = useCallback(async (input: SearchRequest) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setRequest(input)
    setEntities([])
    setMessage(null)
    setStatus('searching')

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        setStatus('error')
        setMessage('Search failed. Please try again.')
        return
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader()
      let buffer = ''
      const outcome = { failed: false }

      const handleLine = (line: string) => {
        const event = parseSearchEvent(line)
        if (!event) return
        if (event.type === 'entity') {
          setEntities((current) => [...current, event.entity])
        } else if (event.type === 'error') {
          outcome.failed = true
          setMessage(event.message)
        }
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          if (buffer !== '') handleLine(buffer)
          break
        }
        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        lines.filter(Boolean).forEach(handleLine)
      }

      setStatus(outcome.failed ? 'error' : 'done')
    } catch (error) {
      if (controller.signal.aborted) return
      console.error(error)
      setStatus('error')
      setMessage('Search failed. Please try again.')
    }
  }, [])

  return { entities, status, message, request, search }
}
