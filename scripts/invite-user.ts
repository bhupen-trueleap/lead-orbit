import postgres from 'postgres'

const input = process.argv.slice(2)
const email = (input.find((value) => !value.startsWith('--')) ?? '')
  .trim()
  .toLowerCase()
if (!email.includes('@')) {
  console.error('Usage: pnpm user:invite <email> [--admin]')
  process.exit(1)
}
const role = input.includes('--admin') ? 'admin' : 'user'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const sql = postgres(url, { max: 1 })

try {
  await sql`
    insert into auth_invite (email, role) values (${email}, ${role})
    on conflict (email) do update set role = excluded.role`
  const accounts = await sql`
    select 1 from auth_account a join auth_user u on u.id = a.user_id
    where lower(u.email) = ${email} and a.provider_id = 'credential'`
  console.info(`Invited ${email} as ${role}.`)
  if (accounts.count === 0) {
    console.info(`Next: pnpm user:password ${email}`)
  }
} finally {
  await sql.end()
}
