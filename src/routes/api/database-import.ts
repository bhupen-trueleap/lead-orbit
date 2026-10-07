import { createFileRoute } from '@tanstack/react-router'

import { isUuid } from '@/lib/columns'
import type { FieldValue } from '@/lib/columns'
import {
  IMPORT_BATCH_SIZE,
  isTypeChoice,
  toEntityKind,
} from '@/lib/database-import'
import type { ImportRow } from '@/lib/database-import'
import { isRecord } from '@/lib/guards'
import { getRequestEmail } from '@/server/auth'
import { importRows } from '@/server/database-import'

const MAX_TEXT = 2000

function parseRow(value: unknown): ImportRow | null {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.url !== 'string' ||
    value.name.length > MAX_TEXT ||
    value.url.length > MAX_TEXT ||
    !isRecord(value.values)
  ) {
    return null
  }
  const values: Record<string, FieldValue> = {}
  for (const [columnId, item] of Object.entries(value.values)) {
    if (!isUuid(columnId)) return null
    if (typeof item === 'string') values[columnId] = item.slice(0, MAX_TEXT)
    else if (typeof item === 'number' || typeof item === 'boolean') {
      values[columnId] = item
    } else return null
  }
  return {
    name: value.name,
    url: value.url,
    type: typeof value.type === 'string' ? toEntityKind(value.type) : null,
    values,
  }
}

export const Route = createFileRoute('/api/database-import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await getRequestEmail(request))) {
          return new Response('Unauthorized', { status: 401 })
        }
        const body: unknown = await request.json().catch(() => null)
        if (
          !isRecord(body) ||
          !Array.isArray(body.rows) ||
          body.rows.length > IMPORT_BATCH_SIZE ||
          !isTypeChoice(body.defaultType)
        ) {
          return new Response('Invalid request', { status: 400 })
        }
        const rows = body.rows.map(parseRow)
        if (rows.some((row) => row === null)) {
          return new Response('Invalid request', { status: 400 })
        }
        return Response.json(
          await importRows(
            rows.flatMap((row) => (row ? [row] : [])),
            body.defaultType,
          ),
        )
      },
    },
  },
})
