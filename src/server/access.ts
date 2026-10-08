import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { invite } from '@/db/auth-schema'
import type { Role } from '@/lib/viewer'

export function fallbackAdmins(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== ''),
  )
}

export async function roleOf(email: string): Promise<Role | null> {
  const normalized = email.trim().toLowerCase()
  if (fallbackAdmins().has(normalized)) return 'admin'
  const row = (
    await db
      .select({ role: invite.role })
      .from(invite)
      .where(eq(invite.email, normalized))
  ).at(0)
  return row?.role ?? null
}
