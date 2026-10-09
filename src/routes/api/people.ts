import { createFileRoute } from '@tanstack/react-router'

import { isRecord } from '@/lib/guards'
import { parseEmail, parsePassword, parseRole } from '@/lib/people'
import type { SavePersonResult } from '@/lib/people'
import type { Viewer } from '@/lib/viewer'
import { getRequestViewer } from '@/server/auth'
import { sendSignInDetails } from '@/server/email'
import {
  changeRole,
  invitePerson,
  listPeople,
  removePerson,
  resetPassword,
} from '@/server/people'

const unauthorized = () => new Response('Unauthorized', { status: 401 })
const invalid = () => new Response('Invalid request', { status: 400 })

const statuses: Record<SavePersonResult, number> = {
  ok: 204,
  duplicate: 409,
  forbidden: 403,
  missing: 404,
  error: 500,
}

function respond(result: SavePersonResult): Response {
  return new Response(null, { status: statuses[result] })
}

async function getAdmin(request: Request): Promise<Viewer | null> {
  const viewer = await getRequestViewer(request)
  return viewer?.role === 'admin' ? viewer : null
}

export const Route = createFileRoute('/api/people')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const viewer = await getAdmin(request)
        if (!viewer) return unauthorized()
        return Response.json(
          { people: await listPeople(viewer) },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
      POST: async ({ request }) => {
        if (!(await getAdmin(request))) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        if (!isRecord(body)) return invalid()
        const email = parseEmail(body.email)
        const role = parseRole(body.role)
        const password = parsePassword(body.password)
        if (!email || !role || !password) return invalid()

        const invited = await invitePerson(email, role, password)
        if (invited !== 'ok') return respond(invited)
        return Response.json({
          email: await sendSignInDetails(email, password, 'invite'),
        })
      },
      PATCH: async ({ request }) => {
        const viewer = await getAdmin(request)
        if (!viewer) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        if (!isRecord(body)) return invalid()
        const email = parseEmail(body.email)
        const role = parseRole(body.role)
        const password = parsePassword(body.password)
        if (!email || (!role && !password)) return invalid()

        if (role) {
          const changed = await changeRole(viewer, email, role)
          if (changed !== 'ok' || !password) return respond(changed)
        }
        if (!password) return respond('ok')

        const reset = await resetPassword(viewer, email, password)
        if (reset !== 'ok') return respond(reset)
        return Response.json({
          email: await sendSignInDetails(email, password, 'reset'),
        })
      },
      DELETE: async ({ request }) => {
        const viewer = await getAdmin(request)
        if (!viewer) return unauthorized()

        const body: unknown = await request.json().catch(() => null)
        const email = isRecord(body) ? parseEmail(body.email) : null
        if (!email) return invalid()

        return respond(await removePerson(viewer, email))
      },
    },
  },
})
