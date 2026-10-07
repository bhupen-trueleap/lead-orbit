import { createFileRoute } from '@tanstack/react-router'

import { isUuid } from '@/lib/columns'
import { MAX_ENTITY_QUERY_LENGTH, parseEntityFilters } from '@/lib/entities'
import { csvFileName, entityCsvHeader, entityCsvRow, toCsv } from '@/lib/csv'
import { getAdminEmail } from '@/server/auth'
import { getCollectionPage } from '@/server/collections'
import { listColumns } from '@/server/columns'

const EXPORT_PAGE_SIZE = 100
const MAX_EXPORT_ROWS = 5_000
const MAX_PARAM_LENGTH = 4000
const COLUMN_KEYS = /^[a-z0-9_]{1,48}(,[a-z0-9_]{1,48}){0,29}$/

export const Route = createFileRoute('/api/collection-export')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await getAdminEmail(request))) {
          return new Response('Unauthorized', { status: 401 })
        }

        const params = new URL(request.url).searchParams
        const collectionId = params.get('collectionId')
        const show = params.get('show') ?? ''
        if (
          !isUuid(collectionId) ||
          (show !== '' && !COLUMN_KEYS.test(show)) ||
          (params.get('cols') ?? '').length > MAX_PARAM_LENGTH ||
          (params.get('q') ?? '').length > MAX_ENTITY_QUERY_LENGTH
        ) {
          return new Response('Invalid request', { status: 400 })
        }

        const byKey = new Map(
          (await listColumns()).map((column) => [column.key, column]),
        )
        const columns = show.split(',').flatMap((key) => {
          const column = byKey.get(key)
          return column ? [column] : []
        })

        const filters = parseEntityFilters(Object.fromEntries(params))
        const rows = [entityCsvHeader(columns)]
        let name = 'collection'
        for (let page = 1; rows.length <= MAX_EXPORT_ROWS; page += 1) {
          const result = await getCollectionPage(
            collectionId,
            page,
            EXPORT_PAGE_SIZE,
            filters,
          )
          if (!result) return new Response('Not found', { status: 404 })
          name = result.collection.name
          for (const entity of result.entities) {
            rows.push(entityCsvRow(entity, columns))
          }
          if (page * EXPORT_PAGE_SIZE >= result.total) break
        }

        return new Response(toCsv(rows.slice(0, MAX_EXPORT_ROWS + 1)), {
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="${csvFileName(name)}"`,
            'cache-control': 'no-store',
          },
        })
      },
    },
  },
})
