import type { Role } from '@/lib/viewer'

function emailSet(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== ''),
  )
}

export function roleFor(email: string): Role {
  return emailSet(process.env.ADMIN_EMAILS).has(email.toLowerCase())
    ? 'admin'
    : 'user'
}

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return (
    roleFor(normalized) === 'admin' ||
    emailSet(process.env.ALLOWED_EMAILS).has(normalized)
  )
}
