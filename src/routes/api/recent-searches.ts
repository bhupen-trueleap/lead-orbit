import { createFileRoute } from '@tanstack/react-router'

import { getRequestEmail } from '@/server/auth'
import { listRecentSearches } from '@/server/recent-searches'

const RECENT_LIMIT = 6

export const Route = createFileRoute('/api/recent-searches')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        return Response.json(
          { searches: await listRecentSearches(email, RECENT_LIMIT) },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
    },
  },
})
