import type { Viewer } from '@/lib/viewer'
import { roleOf } from '@/server/access'
import { auth } from '@/server/better-auth'

export async function viewerFromHeaders(
  headers: Headers,
): Promise<Viewer | null> {
  const current = await auth.api.getSession({ headers })
  const email = current?.user.email.toLowerCase()
  if (!email) return null
  const role = await roleOf(email)
  return role ? { email, role } : null
}

export async function getRequestViewer(
  request: Request,
): Promise<Viewer | null> {
  return viewerFromHeaders(request.headers)
}

export async function getRequestEmail(
  request: Request,
): Promise<string | null> {
  return (await getRequestViewer(request))?.email ?? null
}

export async function getAdminEmail(request: Request): Promise<string | null> {
  const viewer = await getRequestViewer(request)
  return viewer?.role === 'admin' ? viewer.email : null
}
