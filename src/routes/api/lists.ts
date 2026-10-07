import { createFileRoute } from '@tanstack/react-router'

import { isUuid } from '@/lib/columns'
import { isRecord } from '@/lib/guards'
import { isListScope, parseListName } from '@/lib/lists'
import { getRequestViewer } from '@/server/auth'
import {
  createList,
  deleteList,
  getList,
  listLists,
  renameList,
} from '@/server/lists'

const unauthorized = () => new Response('Unauthorized', { status: 401 })
const invalid = () => new Response('Invalid request', { status: 400 })
const notFound = () => new Response('Not found', { status: 404 })
const duplicate = () =>
  new Response('You already have a list with this name', { status: 409 })
const noStore = { headers: { 'cache-control': 'no-store' } }

export const Route = createFileRoute('/api/lists')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return unauthorized()

        const params = new URL(request.url).searchParams
        const id = params.get('id')
        if (id !== null) {
          if (!isUuid(id)) return invalid()
          const list = await getList(id, viewer)
          return list ? Response.json({ list }, noStore) : notFound()
        }

        const scope = params.get('scope') ?? 'mine'
        if (!isListScope(scope)) return invalid()
        return Response.json({ lists: await listLists(viewer, scope) }, noStore)
      },
      POST: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        const name = isRecord(body) ? parseListName(body.name) : null
        if (!name) return invalid()

        const list = await createList(viewer, name)
        return list ? Response.json({ list }, { status: 201 }) : duplicate()
      },
      PATCH: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        const name = isRecord(body) ? parseListName(body.name) : null
        if (!isRecord(body) || !isUuid(body.id) || !name) return invalid()

        const list = await renameList(viewer, body.id, name)
        if (list === 'duplicate') return duplicate()
        return list ? Response.json({ list }) : notFound()
      },
      DELETE: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        if (!isRecord(body) || !isUuid(body.id)) return invalid()

        await deleteList(viewer, body.id)
        return new Response(null, { status: 204 })
      },
    },
  },
})
