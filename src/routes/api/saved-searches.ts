import { createFileRoute } from '@tanstack/react-router'

import { parseDeleteRequest } from '@/lib/saved-searches'
import { parseSearchRequest } from '@/lib/search'
import { getRequestEmail } from '@/server/auth'
import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
} from '@/server/saved-searches'

export const Route = createFileRoute('/api/saved-searches')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const savedSearches = await listSavedSearches(email)
        return Response.json(
          { savedSearches },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
      POST: async ({ request }) => {
        const email = getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const parsed = parseSearchRequest(
          await request.json().catch(() => null),
        )
        if (!parsed) return new Response('Invalid request', { status: 400 })

        await saveSearch(parsed, email)
        return new Response(null, { status: 204 })
      },
      DELETE: async ({ request }) => {
        const email = getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const id = parseDeleteRequest(await request.json().catch(() => null))
        if (!id) return new Response('Invalid request', { status: 400 })

        await deleteSavedSearch(id, email)
        return new Response(null, { status: 204 })
      },
    },
  },
})
