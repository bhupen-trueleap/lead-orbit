import { AsyncLocalStorage } from 'node:async_hooks'

import type { SearchEvent } from '@/lib/search'

const encoder = new TextEncoder()

function encodeEvent(event: SearchEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`)
}

export function eventStreamResponse(
  events: AsyncGenerator<SearchEvent>,
): Response {
  const inRequest = AsyncLocalStorage.snapshot()
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await inRequest(() => events.next())
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
      await inRequest(() => events.return(undefined))
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
