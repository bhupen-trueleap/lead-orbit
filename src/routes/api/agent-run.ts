import { createFileRoute } from '@tanstack/react-router'

import { isRecord } from '@/lib/guards'
import { isUuid } from '@/lib/columns'
import { resumeAgentSearch } from '@/server/agent-search'
import { getRequestViewer } from '@/server/auth'
import { eventStreamResponse } from '@/server/event-stream'
import { canSearch } from '@/server/settings'

export const Route = createFileRoute('/api/agent-run')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return new Response('Unauthorized', { status: 401 })
        if (!(await canSearch(viewer, 'agent'))) {
          return new Response('Search type not allowed', { status: 403 })
        }

        const body: unknown = await request.json().catch(() => null)
        if (!isRecord(body) || !isUuid(body.searchId)) {
          return new Response('Invalid request', { status: 400 })
        }

        return eventStreamResponse(
          resumeAgentSearch(body.searchId, viewer.email),
        )
      },
    },
  },
})
