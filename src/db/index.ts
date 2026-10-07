import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '@/db/schema'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
}

declare global {
  var leadOrbitSql: ReturnType<typeof postgres> | undefined
}

globalThis.leadOrbitSql ??= postgres(databaseUrl)

export const db = drizzle(globalThis.leadOrbitSql, {
  schema,
  casing: 'snake_case',
})
