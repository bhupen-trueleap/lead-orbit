import { createFileRoute } from '@tanstack/react-router'

import { isRecord } from '@/lib/guards'
import { parseUserSearchSettings } from '@/lib/settings'
import { getRequestViewer } from '@/server/auth'
import {
  getUserSearchSettings,
  saveUserSearchSettings,
} from '@/server/settings'

const noStore = { headers: { 'cache-control': 'no-store' } }

export const Route = createFileRoute('/api/settings')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await getRequestViewer(request))) {
          return new Response('Unauthorized', { status: 401 })
        }
        return Response.json(
          { userSearch: await getUserSearchSettings() },
          noStore,
        )
      },
      PUT: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (viewer?.role !== 'admin') {
          return new Response('Unauthorized', { status: 401 })
        }

        const body: unknown = await request.json().catch(() => null)
        const userSearch = isRecord(body)
          ? parseUserSearchSettings(body.userSearch)
          : null
        if (!userSearch) return new Response('Invalid request', { status: 400 })

        return Response.json(
          { userSearch: await saveUserSearchSettings(userSearch) },
          noStore,
        )
      },
    },
  },
})
