import { createFileRoute } from '@tanstack/react-router'

import {
  MAX_SAVED_QUERY_LENGTH,
  parseDeleteRequest,
  parseSavedSearchFilters,
} from '@/lib/saved-searches'
import { parseSearchRequest } from '@/lib/search'
import { getAdminEmail } from '@/server/auth'
import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
} from '@/server/saved-searches'
import { DEFAULT_PAGE_SIZE, isResultCount, isPage } from '@/lib/pagination'

export const Route = createFileRoute('/api/saved-searches')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = await getAdminEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const params = new URL(request.url).searchParams
        const page = Number(params.get('page') ?? 1)
        const pageSize = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE)
        if (
          !isPage(page) ||
          !isResultCount(pageSize) ||
          (params.get('q') ?? '').length > MAX_SAVED_QUERY_LENGTH
        ) {
          return new Response('Invalid request', { status: 400 })
        }

        const filters = parseSavedSearchFilters(Object.fromEntries(params))
        return Response.json(
          await listSavedSearches(email, page, pageSize, filters),
          { headers: { 'cache-control': 'no-store' } },
        )
      },
      POST: async ({ request }) => {
        const email = await getAdminEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const parsed = parseSearchRequest(
          await request.json().catch(() => null),
        )
        if (!parsed) return new Response('Invalid request', { status: 400 })

        await saveSearch(parsed, email)
        return new Response(null, { status: 204 })
      },
      DELETE: async ({ request }) => {
        const email = await getAdminEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const id = parseDeleteRequest(await request.json().catch(() => null))
        if (!id) return new Response('Invalid request', { status: 400 })

        await deleteSavedSearch(id, email)
        return new Response(null, { status: 204 })
      },
    },
  },
})
