import { createFileRoute } from '@tanstack/react-router'

import { csvFileName, entityCsvHeader, entityCsvRow, toCsv } from '@/lib/csv'
import { MAX_ENTITY_QUERY_LENGTH, parseEntityFilters } from '@/lib/entities'
import { getRequestEmail } from '@/server/auth'
import { listColumns } from '@/server/columns'
import { listEntities } from '@/server/entities'

const EXPORT_PAGE_SIZE = 100
const MAX_EXPORT_ROWS = 5_000
const MAX_PARAM_LENGTH = 4000
const COLUMN_KEYS = /^[a-z0-9_]{1,48}(,[a-z0-9_]{1,48}){0,29}$/

export const Route = createFileRoute('/api/entities-export')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!getRequestEmail(request)) {
          return new Response('Unauthorized', { status: 401 })
        }

        const params = new URL(request.url).searchParams
        const show = params.get('show') ?? ''
        if (
          (params.get('cols') ?? '').length > MAX_PARAM_LENGTH ||
          (params.get('q') ?? '').length > MAX_ENTITY_QUERY_LENGTH ||
          (show !== '' && !COLUMN_KEYS.test(show))
        ) {
          return new Response('Invalid request', { status: 400 })
        }

        const filters = parseEntityFilters(Object.fromEntries(params))
        const byKey = new Map(
          (await listColumns()).map((column) => [column.key, column]),
        )
        const columns = show.split(',').flatMap((key) => {
          const column = byKey.get(key)
          return column ? [column] : []
        })

        const rows = [entityCsvHeader(columns)]
        for (let page = 1; rows.length <= MAX_EXPORT_ROWS; page += 1) {
          const result = await listEntities(page, EXPORT_PAGE_SIZE, filters)
          for (const entity of result.entities) {
            rows.push(entityCsvRow(entity, columns))
          }
          if (page * EXPORT_PAGE_SIZE >= result.total) break
        }

        return new Response(toCsv(rows.slice(0, MAX_EXPORT_ROWS + 1)), {
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="${csvFileName(filters.q ?? 'entities')}"`,
            'cache-control': 'no-store',
          },
        })
      },
    },
  },
})
