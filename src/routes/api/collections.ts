import { createFileRoute } from '@tanstack/react-router'

import { parseCollectionName } from '@/lib/collections'
import { isUuid } from '@/lib/columns'
import { isRecord } from '@/lib/guards'
import { getAdminEmail } from '@/server/auth'
import {
  createCollection,
  deleteCollection,
  listCollections,
  renameCollection,
} from '@/server/collections'

const unauthorized = () => new Response('Unauthorized', { status: 401 })
const invalid = () => new Response('Invalid request', { status: 400 })
const duplicate = () => new Response('Name already in use', { status: 409 })

export const Route = createFileRoute('/api/collections')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await getAdminEmail(request))) return unauthorized()
        return Response.json(
          { collections: await listCollections() },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
      POST: async ({ request }) => {
        if (!(await getAdminEmail(request))) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        const name = isRecord(body) ? parseCollectionName(body.name) : null
        if (!name) return invalid()

        const collection = await createCollection(name)
        if (!collection) return duplicate()
        return Response.json({ collection }, { status: 201 })
      },
      PATCH: async ({ request }) => {
        if (!(await getAdminEmail(request))) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        const name = isRecord(body) ? parseCollectionName(body.name) : null
        if (!isRecord(body) || !isUuid(body.id) || !name) return invalid()

        const collection = await renameCollection(body.id, name)
        if (collection === 'duplicate') return duplicate()
        if (!collection) return new Response('Not found', { status: 404 })
        return Response.json({ collection })
      },
      DELETE: async ({ request }) => {
        if (!(await getAdminEmail(request))) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        if (!isRecord(body) || !isUuid(body.id)) return invalid()

        await deleteCollection(body.id)
        return new Response(null, { status: 204 })
      },
    },
  },
})
