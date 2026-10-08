import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'

import { db } from '@/db'
import { account, invite, session, user } from '@/db/auth-schema'
import type { Person, SavePersonResult } from '@/lib/people'
import type { Role, Viewer } from '@/lib/viewer'
import { fallbackAdmins } from '@/server/access'
import { hashPassword } from '@/server/password'

const CREDENTIAL = 'credential'

export async function listPeople(viewer: Viewer): Promise<Array<Person>> {
  const [invites, withPassword] = await Promise.all([
    db.select().from(invite),
    db
      .select({ email: sql<string>`lower(${user.email})` })
      .from(account)
      .innerJoin(user, eq(user.id, account.userId))
      .where(
        and(eq(account.providerId, CREDENTIAL), isNotNull(account.password)),
      ),
  ])
  const passwords = new Set(withPassword.map((row) => row.email))
  const people = new Map<string, Person>()
  for (const row of invites) {
    people.set(row.email, {
      email: row.email,
      role: row.role,
      hasPassword: passwords.has(row.email),
      invitedAt: row.createdAt.toISOString(),
      isFallbackAdmin: false,
      isYou: row.email === viewer.email,
    })
  }
  for (const email of fallbackAdmins()) {
    people.set(email, {
      email,
      role: 'admin',
      hasPassword: passwords.has(email),
      invitedAt: people.get(email)?.invitedAt ?? null,
      isFallbackAdmin: true,
      isYou: email === viewer.email,
    })
  }
  return [...people.values()].sort((a, b) => a.email.localeCompare(b.email))
}

async function isInvited(email: string): Promise<boolean> {
  const rows = await db
    .select({ email: invite.email })
    .from(invite)
    .where(eq(invite.email, email))
  return rows.length > 0
}

async function userIdsFor(email: string): Promise<Array<string>> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email))
  return rows.map((row) => row.id)
}

async function endSessions(email: string): Promise<void> {
  const ids = await userIdsFor(email)
  if (ids.length > 0) {
    await db.delete(session).where(inArray(session.userId, ids))
  }
}

async function storePassword(email: string, password: string): Promise<void> {
  const hash = await hashPassword(password)
  const existing = (await userIdsFor(email)).at(0)
  const userId = existing ?? crypto.randomUUID()
  if (!existing) {
    await db.insert(user).values({
      id: userId,
      name: email.split('@')[0],
      email,
      emailVerified: true,
    })
  }
  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: sql`now()` })
    .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL)))
    .returning({ id: account.id })
  if (updated.length === 0) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      userId,
      accountId: userId,
      providerId: CREDENTIAL,
      password: hash,
    })
  }
}

export async function invitePerson(
  email: string,
  role: Role,
  password: string,
): Promise<SavePersonResult> {
  if (fallbackAdmins().has(email)) return 'duplicate'
  const created = await db
    .insert(invite)
    .values({ email, role })
    .onConflictDoNothing()
    .returning({ email: invite.email })
  if (created.length === 0) return 'duplicate'
  await storePassword(email, password)
  await endSessions(email)
  return 'ok'
}

export async function changeRole(
  viewer: Viewer,
  email: string,
  role: Role,
): Promise<SavePersonResult> {
  if (email === viewer.email || fallbackAdmins().has(email)) return 'forbidden'
  const updated = await db
    .update(invite)
    .set({ role })
    .where(eq(invite.email, email))
    .returning({ email: invite.email })
  return updated.length > 0 ? 'ok' : 'missing'
}

export async function resetPassword(
  viewer: Viewer,
  email: string,
  password: string,
): Promise<SavePersonResult> {
  if (!fallbackAdmins().has(email) && !(await isInvited(email))) {
    return 'missing'
  }
  await storePassword(email, password)
  if (email !== viewer.email) await endSessions(email)
  return 'ok'
}

export async function removePerson(
  viewer: Viewer,
  email: string,
): Promise<SavePersonResult> {
  if (email === viewer.email || fallbackAdmins().has(email)) return 'forbidden'
  const removed = await db
    .delete(invite)
    .where(eq(invite.email, email))
    .returning({ email: invite.email })
  if (removed.length === 0) return 'missing'
  await endSessions(email)
  return 'ok'
}
