import { createFileRoute } from '@tanstack/react-router'

import { parseSearchRequest } from '@/lib/search'
import { getRequestViewer } from '@/server/auth'
import { eventStreamResponse } from '@/server/event-stream'
import { runSearch } from '@/server/search'
import { canSearch } from '@/server/settings'

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return new Response('Unauthorized', { status: 401 })

        const body: unknown = await request.json().catch(() => null)
        const parsed = parseSearchRequest(body)
        if (!parsed) return new Response('Invalid request', { status: 400 })

        if (!(await canSearch(viewer, parsed.mode))) {
          return new Response('Search type not allowed', { status: 403 })
        }

        return eventStreamResponse(
          runSearch({ ...parsed, email: viewer.email }),
        )
      },
    },
  },
})
