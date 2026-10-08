import { isRecord } from '@/lib/guards'
import type { Role } from '@/lib/viewer'

export const MAX_EMAIL_LENGTH = 254
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

const GENERATED_PASSWORD_LENGTH = 16
const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export interface Person {
  email: string
  role: Role
  hasPassword: boolean
  invitedAt: string | null
  isFallbackAdmin: boolean
  isYou: boolean
}

export type SavePersonResult =
  'ok' | 'duplicate' | 'forbidden' | 'missing' | 'error'

export function parseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null
}

export function parseRole(value: unknown): Role | null {
  return value === 'admin' || value === 'user' ? value : null
}

export function parsePassword(value: unknown): string | null {
  return typeof value === 'string' &&
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH
    ? value
    : null
}

export function generatePassword(): string {
  const limit = 256 - (256 % PASSWORD_ALPHABET.length)
  let password = ''
  while (password.length < GENERATED_PASSWORD_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(32))) {
      if (byte >= limit || password.length >= GENERATED_PASSWORD_LENGTH) {
        continue
      }
      password += PASSWORD_ALPHABET.charAt(byte % PASSWORD_ALPHABET.length)
    }
  }
  return password
}

function parsePerson(value: unknown): Person | null {
  if (!isRecord(value)) return null
  const role = parseRole(value.role)
  if (
    typeof value.email !== 'string' ||
    !role ||
    typeof value.hasPassword !== 'boolean' ||
    typeof value.isFallbackAdmin !== 'boolean' ||
    typeof value.isYou !== 'boolean'
  ) {
    return null
  }
  return {
    email: value.email,
    role,
    hasPassword: value.hasPassword,
    invitedAt: typeof value.invitedAt === 'string' ? value.invitedAt : null,
    isFallbackAdmin: value.isFallbackAdmin,
    isYou: value.isYou,
  }
}

async function send(
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
): Promise<SavePersonResult> {
  const response = await fetch('/api/people', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (response.ok) return 'ok'
  if (response.status === 409) return 'duplicate'
  if (response.status === 403) return 'forbidden'
  if (response.status === 404) return 'missing'
  return 'error'
}

export async function fetchPeople(
  signal?: AbortSignal,
): Promise<Array<Person> | null> {
  const response = await fetch('/api/people', { signal })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.people)) return null
  return data.people.flatMap((item: unknown) => {
    const person = parsePerson(item)
    return person ? [person] : []
  })
}

export function invitePerson(
  email: string,
  role: Role,
  password: string,
): Promise<SavePersonResult> {
  return send('POST', { email, role, password })
}

export function changeRole(
  email: string,
  role: Role,
): Promise<SavePersonResult> {
  return send('PATCH', { email, role })
}

export function resetPassword(
  email: string,
  password: string,
): Promise<SavePersonResult> {
  return send('PATCH', { email, password })
}

export function removePerson(email: string): Promise<SavePersonResult> {
  return send('DELETE', { email })
}
