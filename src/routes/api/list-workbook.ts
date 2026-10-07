import { createFileRoute } from '@tanstack/react-router'

import { isUuid } from '@/lib/columns'
import { isRecord } from '@/lib/guards'
import { MAX_WORKBOOK_BYTES, isWorkbookData } from '@/lib/lists'
import { getRequestViewer } from '@/server/auth'
import { getWorkbook, saveWorkbook } from '@/server/lists'

const notFound = () => new Response('Not found', { status: 404 })

export const Route = createFileRoute('/api/list-workbook')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return new Response('Unauthorized', { status: 401 })

        const id = new URL(request.url).searchParams.get('id')
        if (!isUuid(id)) return new Response('Invalid request', { status: 400 })

        const result = await getWorkbook(id, viewer)
        return result
          ? Response.json(result, { headers: { 'cache-control': 'no-store' } })
          : notFound()
      },
      PUT: async ({ request }) => {
        const viewer = await getRequestViewer(request)
        if (!viewer) return new Response('Unauthorized', { status: 401 })

        const text = await request.text()
        if (text.length > MAX_WORKBOOK_BYTES) {
          return new Response('This list is too large to save.', {
            status: 413,
          })
        }
        let body: unknown = null
        try {
          body = JSON.parse(text)
        } catch {
          body = null
        }
        if (
          !isRecord(body) ||
          !isUuid(body.id) ||
          !isWorkbookData(body.workbook) ||
          typeof body.rowCount !== 'number' ||
          !Number.isInteger(body.rowCount) ||
          body.rowCount < 0
        ) {
          return new Response('Invalid request', { status: 400 })
        }

        return (await saveWorkbook(
          viewer,
          body.id,
          body.workbook,
          body.rowCount,
        ))
          ? new Response(null, { status: 204 })
          : notFound()
      },
    },
  },
})
