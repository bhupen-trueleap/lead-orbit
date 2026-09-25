import { createFileRoute } from '@tanstack/react-router'

import { DEFAULT_PAGE_SIZE, isPage, isPageSize } from '@/lib/entities'
import { getRequestEmail } from '@/server/auth'
import { listEntities } from '@/server/entities'

export const Route = createFileRoute('/api/entities')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!getRequestEmail(request)) {
          return new Response('Unauthorized', { status: 401 })
        }

        const params = new URL(request.url).searchParams
        const page = Number(params.get('page') ?? 1)
        const pageSize = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE)
        if (!isPage(page) || !isPageSize(pageSize)) {
          return new Response('Invalid request', { status: 400 })
        }

        return Response.json(await listEntities(page, pageSize), {
          headers: { 'cache-control': 'no-store' },
        })
      },
    },
  },
})
