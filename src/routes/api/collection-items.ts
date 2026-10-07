import { createFileRoute } from '@tanstack/react-router'

import { parseItemIds } from '@/lib/collections'
import { isUuid } from '@/lib/columns'
import { isRecord } from '@/lib/guards'
import { MAX_ENTITY_QUERY_LENGTH, parseEntityFilters } from '@/lib/entities'
import { DEFAULT_PAGE_SIZE, isPage, isResultCount } from '@/lib/pagination'
import { getAdminEmail } from '@/server/auth'
import {
  addCollectionItems,
  getCollectionPage,
  removeCollectionItems,
} from '@/server/collections'

const MAX_COLUMN_FILTERS_LENGTH = 4000

const unauthorized = () => new Response('Unauthorized', { status: 401 })
const invalid = () => new Response('Invalid request', { status: 400 })
const notFound = () => new Response('Not found', { status: 404 })

function parseItemsRequest(
  body: unknown,
): { collectionId: string; ids: Array<string> } | null {
  if (!isRecord(body) || !isUuid(body.collectionId)) return null
  const ids = parseItemIds(body.ids)
  return ids ? { collectionId: body.collectionId, ids } : null
}

export const Route = createFileRoute('/api/collection-items')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await getAdminEmail(request))) return unauthorized()

        const params = new URL(request.url).searchParams
        const collectionId = params.get('collectionId')
        const page = Number(params.get('page') ?? 1)
        const pageSize = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE)
        if (
          !isUuid(collectionId) ||
          !isPage(page) ||
          !isResultCount(pageSize) ||
          (params.get('cols') ?? '').length > MAX_COLUMN_FILTERS_LENGTH ||
          (params.get('q') ?? '').length > MAX_ENTITY_QUERY_LENGTH
        ) {
          return invalid()
        }

        const result = await getCollectionPage(
          collectionId,
          page,
          pageSize,
          parseEntityFilters(Object.fromEntries(params)),
        )
        if (!result) return notFound()
        return Response.json(result, {
          headers: { 'cache-control': 'no-store' },
        })
      },
      POST: async ({ request }) => {
        if (!(await getAdminEmail(request))) return unauthorized()

        const parsed = parseItemsRequest(await request.json().catch(() => null))
        if (!parsed) return invalid()

        const result = await addCollectionItems(parsed.collectionId, parsed.ids)
        if (!result) return notFound()
        return Response.json(result)
      },
      DELETE: async ({ request }) => {
        if (!(await getAdminEmail(request))) return unauthorized()

        const parsed = parseItemsRequest(await request.json().catch(() => null))
        if (!parsed) return invalid()

        await removeCollectionItems(parsed.collectionId, parsed.ids)
        return new Response(null, { status: 204 })
      },
    },
  },
})
