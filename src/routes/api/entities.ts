import { createFileRoute } from '@tanstack/react-router'

import { MAX_ENTITY_QUERY_LENGTH, parseEntityFilters } from '@/lib/entities'
import { getAdminEmail } from '@/server/auth'
import { listEntities } from '@/server/entities'
import { DEFAULT_PAGE_SIZE, isResultCount, isPage } from '@/lib/pagination'

const MAX_COLUMN_FILTERS_LENGTH = 4000

export const Route = createFileRoute('/api/entities')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await getAdminEmail(request))) {
          return new Response('Unauthorized', { status: 401 })
        }

        const params = new URL(request.url).searchParams
        const page = Number(params.get('page') ?? 1)
        const pageSize = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE)
        if (!isPage(page) || !isResultCount(pageSize)) {
          return new Response('Invalid request', { status: 400 })
        }
        if ((params.get('cols') ?? '').length > MAX_COLUMN_FILTERS_LENGTH) {
          return new Response('Invalid request', { status: 400 })
        }
        if ((params.get('q') ?? '').length > MAX_ENTITY_QUERY_LENGTH) {
          return new Response('Invalid request', { status: 400 })
        }

        const filters = parseEntityFilters(Object.fromEntries(params))
        return Response.json(await listEntities(page, pageSize, filters), {
          headers: { 'cache-control': 'no-store' },
        })
      },
    },
  },
})
