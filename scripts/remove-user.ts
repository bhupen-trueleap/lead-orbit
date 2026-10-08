import postgres from 'postgres'

const email = (process.argv.at(2) ?? '').trim().toLowerCase()
if (!email.includes('@')) {
  console.error('Usage: pnpm user:remove <email>')
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const sql = postgres(url, { max: 1 })

try {
  const removed = await sql.begin(async (tx) => {
    const invites = await tx`delete from auth_invite where email = ${email}`
    await tx`
      delete from auth_session where user_id in (
        select id from auth_user where lower(email) = ${email}
      )`
    return invites.count > 0
  })
  console.info(
    removed
      ? `Removed ${email}: access revoked and signed out everywhere.`
      : `${email} was not on the invite list.`,
  )
} finally {
  await sql.end()
}
