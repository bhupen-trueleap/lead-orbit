import { eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { settings } from '@/db/schema'
import {
  DEFAULT_USER_SEARCH,
  allowedSearchModes,
  parseUserSearchSettings,
} from '@/lib/settings'
import type { UserSearchSettings } from '@/lib/settings'
import type { SearchMode } from '@/lib/search'
import type { Viewer } from '@/lib/viewer'

const USER_SEARCH = 'user_search'

export async function getUserSearchSettings(): Promise<UserSearchSettings> {
  const row = (
    await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, USER_SEARCH))
  ).at(0)
  return parseUserSearchSettings(row?.value) ?? DEFAULT_USER_SEARCH
}

export async function saveUserSearchSettings(
  value: UserSearchSettings,
): Promise<UserSearchSettings> {
  await db
    .insert(settings)
    .values({ key: USER_SEARCH, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: sql`now()` },
    })
  return value
}

export async function canSearch(
  viewer: Viewer,
  mode: SearchMode,
): Promise<boolean> {
  if (viewer.role === 'admin') return true
  return allowedSearchModes(
    viewer.role,
    await getUserSearchSettings(),
  ).includes(mode)
}
