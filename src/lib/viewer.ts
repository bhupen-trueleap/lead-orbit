import { redirect } from '@tanstack/react-router'

export type Role = 'admin' | 'user'

export interface Viewer {
  email: string
  role: Role
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer.role === 'admin'
}

export function requireAdmin({ context }: { context: { viewer: Viewer } }) {
  if (!isAdmin(context.viewer)) throw redirect({ to: '/lists' })
}
