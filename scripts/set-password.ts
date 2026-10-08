import { randomBytes, randomUUID } from 'node:crypto'

import postgres from 'postgres'

import { hashPassword } from '../src/server/password.ts'

const MIN_LENGTH = 8

const args = process.argv.slice(2)
const email = (args.at(0) ?? '').trim().toLowerCase()
if (!email.includes('@')) {
  console.error('Usage: pnpm user:password <email> [password]')
  process.exit(1)
}

const password = args.at(1) ?? randomBytes(12).toString('base64url')
if (password.length < MIN_LENGTH) {
  console.error(`The password must be at least ${MIN_LENGTH} characters.`)
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const invited = [process.env.ADMIN_EMAILS, process.env.ALLOWED_EMAILS]
  .flatMap((list) => (list ?? '').split(','))
  .map((item) => item.trim().toLowerCase())
  .includes(email)

const sql = postgres(url, { max: 1 })
const hash = await hashPassword(password)

try {
  const created = await sql.begin(async (tx) => {
    const existing = (
      await tx<Array<{ id: string }>>`
        select id from auth_user where lower(email) = ${email}`
    ).at(0)
    const userId = existing?.id ?? randomUUID()
    if (!existing) {
      await tx`
        insert into auth_user (id, name, email, email_verified)
        values (${userId}, ${email.split('@')[0]}, ${email}, true)`
    }
    const updated = await tx`
      update auth_account set password = ${hash}, updated_at = now()
      where user_id = ${userId} and provider_id = 'credential'`
    if (updated.count === 0) {
      await tx`
        insert into auth_account (id, user_id, account_id, provider_id, password)
        values (${randomUUID()}, ${userId}, ${userId}, 'credential', ${hash})`
    }
    await tx`delete from auth_session where user_id = ${userId}`
    return !existing
  })

  console.info(
    `${created ? 'Created' : 'Updated'} ${email}. Password: ${password}`,
  )
  if (!invited) {
    console.warn(
      `${email} is not in ADMIN_EMAILS or ALLOWED_EMAILS here, so sign-in will be refused until it is added.`,
    )
  }
} finally {
  await sql.end()
}
