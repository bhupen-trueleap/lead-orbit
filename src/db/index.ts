import { AsyncLocalStorage } from 'node:async_hooks'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '@/db/schema'

function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return url
}

const databaseUrl = readDatabaseUrl()

const IDLE_TIMEOUT_SECONDS = 5

function connect(url: string) {
  return drizzle(
    postgres(url, {
      max: 5,
      idle_timeout: IDLE_TIMEOUT_SECONDS,
      fetch_types: false,
    }),
    { schema, casing: 'snake_case' },
  )
}

type Database = ReturnType<typeof connect>

const requestDatabase = new AsyncLocalStorage<Database>()
const fallback = connect(databaseUrl)

export function withDatabase<T>(run: () => T): T {
  return requestDatabase.run(connect(databaseUrl), run)
}

export const db: Database = new Proxy(fallback, {
  get(target, property) {
    const active = requestDatabase.getStore() ?? target
    const value: unknown = Reflect.get(active, property, active)
    return typeof value === 'function' ? value.bind(active) : value
  },
})
