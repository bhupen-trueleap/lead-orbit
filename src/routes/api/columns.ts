import { createFileRoute } from '@tanstack/react-router'

import { parseColumnDraft } from '@/lib/columns'
import { getRequestEmail } from '@/server/auth'
import { createColumn, listColumns } from '@/server/columns'

export const Route = createFileRoute('/api/columns')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await getRequestEmail(request))) {
          return new Response('Unauthorized', { status: 401 })
        }
        return Response.json(
          { columns: await listColumns() },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
      POST: async ({ request }) => {
        const email = await getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const draft = parseColumnDraft(await request.json().catch(() => null))
        if (!draft) return new Response('Invalid request', { status: 400 })

        const column = await createColumn(draft, email)
        if (!column)
          return new Response('Could not create column', { status: 500 })
        return Response.json({ column }, { status: 201 })
      },
    },
  },
})
