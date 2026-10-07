import { AsyncLocalStorage } from 'node:async_hooks'

import type { DrizzleConfig } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '@/db/schema'

type Database = PostgresJsDatabase<typeof schema>

const IDLE_TIMEOUT_SECONDS = 5
const config = {
  schema,
  casing: 'snake_case',
} satisfies DrizzleConfig<typeof schema>

function connect(): Database {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return drizzle(
    postgres(url, {
      max: 5,
      idle_timeout: IDLE_TIMEOUT_SECONDS,
      fetch_types: false,
    }),
    config,
  )
}

interface Slot {
  database: Database | null
}

const requestSlot = new AsyncLocalStorage<Slot>()
const fallbackSlot: Slot = { database: null }

export function withDatabase<T>(run: () => T): T {
  return requestSlot.run({ database: null }, run)
}

export const db: Database = new Proxy(drizzle.mock(config), {
  get(_target, property) {
    const slot = requestSlot.getStore() ?? fallbackSlot
    const active = (slot.database ??= connect())
    const value: unknown = Reflect.get(active, property, active)
    return typeof value === 'function' ? value.bind(active) : value
  },
})
