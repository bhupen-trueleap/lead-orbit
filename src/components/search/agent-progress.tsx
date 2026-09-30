import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { AgentRunStatus } from '@/lib/agent'

const statusLabels: Record<AgentRunStatus, string> = {
  queued: 'Queued',
  running: 'Agent is building your list',
  completed: 'Saving results',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

interface AgentProgressProps {
  status: AgentRunStatus
  startedAt: number
}

export function AgentProgress({ status, startedAt }: AgentProgressProps) {
  const [now, setNow] = useState(startedAt)

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 font-medium">
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
        />
        {statusLabels[status]}…
        <span className="ml-auto font-normal text-muted-foreground tabular-nums">
          {formatElapsed(now - startedAt)}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Agent runs usually take a minute or two. You can leave this page; the
        results will be in Recent searches.
      </p>
    </div>
  )
}
