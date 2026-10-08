import { isRecord } from '@/lib/guards'
import { SEARCH_MODES } from '@/lib/search'
import type { SearchMode } from '@/lib/search'
import type { Role } from '@/lib/viewer'

export interface UserSearchSettings {
  enabled: boolean
  modes: Array<SearchMode>
}

export const DEFAULT_USER_SEARCH: UserSearchSettings = {
  enabled: true,
  modes: [...SEARCH_MODES],
}

export function parseUserSearchSettings(
  value: unknown,
): UserSearchSettings | null {
  if (
    !isRecord(value) ||
    typeof value.enabled !== 'boolean' ||
    !Array.isArray(value.modes)
  ) {
    return null
  }
  const chosen: Array<unknown> = value.modes
  return {
    enabled: value.enabled,
    modes: SEARCH_MODES.filter((mode) => chosen.includes(mode)),
  }
}

export function allowedSearchModes(
  role: Role,
  settings: UserSearchSettings,
): Array<SearchMode> {
  if (role === 'admin') return [...SEARCH_MODES]
  return settings.enabled ? settings.modes : []
}

function readSettings(data: unknown): UserSearchSettings | null {
  return isRecord(data) ? parseUserSearchSettings(data.userSearch) : null
}

export async function fetchUserSearchSettings(
  signal?: AbortSignal,
): Promise<UserSearchSettings | null> {
  const response = await fetch('/api/settings', { signal })
  if (!response.ok) return null
  return readSettings(await response.json())
}

export async function saveUserSearchSettings(
  settings: UserSearchSettings,
): Promise<UserSearchSettings | null> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userSearch: settings }),
  })
  if (!response.ok) return null
  return readSettings(await response.json())
}
