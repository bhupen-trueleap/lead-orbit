import { createFileRoute } from '@tanstack/react-router'

import { isRecord } from '@/lib/guards'
import { isUuid } from '@/lib/columns'
import { resumeAgentSearch } from '@/server/agent-search'
import { getRequestEmail } from '@/server/auth'
import { eventStreamResponse } from '@/server/event-stream'

export const Route = createFileRoute('/api/agent-run')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const email = await getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const body: unknown = await request.json().catch(() => null)
        if (!isRecord(body) || !isUuid(body.searchId)) {
          return new Response('Invalid request', { status: 400 })
        }

        return eventStreamResponse(resumeAgentSearch(body.searchId, email))
      },
    },
  },
})
