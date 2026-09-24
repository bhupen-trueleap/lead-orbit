import { createFileRoute } from '@tanstack/react-router'

import { parseSearchRequest } from '@/lib/search'
import type { SearchEvent } from '@/lib/search'
import { getRequestEmail } from '@/server/auth'
import { runSearch } from '@/server/search'

const encoder = new TextEncoder()

function encodeEvent(event: SearchEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`)
}

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const email = getRequestEmail(request)
        if (!email) return new Response('Unauthorized', { status: 401 })

        const body: unknown = await request.json().catch(() => null)
        const parsed = parseSearchRequest(body)
        if (!parsed) return new Response('Invalid request', { status: 400 })

        const events = runSearch({ ...parsed, email })

        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const next = await events.next()
              if (next.done) {
                controller.close()
              } else {
                controller.enqueue(encodeEvent(next.value))
              }
            } catch (error) {
              console.error('Search failed', error)
              controller.enqueue(
                encodeEvent({ type: 'error', message: 'Search failed' }),
              )
              controller.close()
            }
          },
          async cancel() {
            await events.return(undefined)
          },
        })

        return new Response(stream, {
          headers: {
            'content-type': 'application/x-ndjson; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      },
    },
  },
})
