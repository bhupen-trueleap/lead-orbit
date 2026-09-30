import { createFileRoute } from '@tanstack/react-router'

import { parseSearchRequest } from '@/lib/search'
import { getRequestEmail } from '@/server/auth'
import { eventStreamResponse } from '@/server/event-stream'
import { runSearch } from '@/server/search'

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const email = getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const body: unknown = await request.json().catch(() => null)
        const parsed = parseSearchRequest(body)
        if (!parsed) return new Response('Invalid request', { status: 400 })

        return eventStreamResponse(runSearch({ ...parsed, email }))
      },
    },
  },
})
