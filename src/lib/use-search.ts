import { useCallback, useRef, useState } from 'react'

import { parseSearchEvent } from '@/lib/search'
import type { SearchEntity, SearchRequest } from '@/lib/search'
import type { AgentRunStatus } from '@/lib/agent'
import type { ColumnDef } from '@/lib/columns'

export type SearchStatus = 'idle' | 'searching' | 'done' | 'error'

export interface AgentProgress {
  searchId: string
  status: AgentRunStatus
}

const FAILURE_MESSAGE = 'Search failed. Please try again.'

export function useSearch() {
  const [entities, setEntities] = useState<Array<SearchEntity>>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [request, setRequest] = useState<SearchRequest | null>(null)
  const [columns, setColumns] = useState<Array<ColumnDef>>([])
  const [agent, setAgent] = useState<AgentProgress | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const stream = useCallback(
    async (
      url: string,
      body: unknown,
      onColumns: (columns: Array<ColumnDef>) => void,
    ) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setColumns([])
      setEntities([])
      setMessage(null)
      setAgent(null)
      setStartedAt(Date.now())
      setStatus('searching')

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          setStatus('error')
          setMessage(FAILURE_MESSAGE)
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
          if (event.type === 'columns') {
            setColumns(event.columns)
            onColumns(event.columns)
          } else if (event.type === 'status') {
            setAgent({ searchId: event.searchId, status: event.status })
          } else if (event.type === 'entity') {
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
        setMessage(FAILURE_MESSAGE)
      }
    },
    [],
  )

  const search = useCallback(
    async (input: SearchRequest) => {
      setRequest(input)
      await stream('/api/search', input, (next) => {
        setRequest({ ...input, columns: next.map((column) => column.id) })
      })
    },
    [stream],
  )

  const resume = useCallback(
    async (searchId: string) => {
      setRequest(null)
      await stream('/api/agent-run', { searchId }, () => undefined)
    },
    [stream],
  )

  return {
    entities,
    columns,
    status,
    message,
    request,
    agent,
    startedAt,
    search,
    resume,
  }
}
