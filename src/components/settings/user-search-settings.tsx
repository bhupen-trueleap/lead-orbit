import { useEffect, useState } from 'react'

import {
  SettingCard,
  SettingOption,
  SettingOptions,
} from '@/components/settings/settings-layout'
import { Switch } from '@/components/ui/switch'
import {
  SEARCH_MODES,
  searchModeLabels,
  searchModeShortHints,
} from '@/lib/search'
import type { SearchMode } from '@/lib/search'
import { fetchUserSearchSettings, saveUserSearchSettings } from '@/lib/settings'
import type { UserSearchSettings } from '@/lib/settings'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const saveLabels: Record<SaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved. Users see this the next time they open a list.',
  error: 'Could not save. Your last change was undone; try again.',
}

export function UserSearchSettingsCard() {
  const [settings, setSettings] = useState<UserSearchSettings | null>(null)
  const [failed, setFailed] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    const controller = new AbortController()
    fetchUserSearchSettings(controller.signal)
      .then((loaded) => {
        if (loaded) setSettings(loaded)
        else setFailed(true)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [])

  async function save(next: UserSearchSettings) {
    const previous = settings
    setSettings(next)
    setSaveState('saving')
    const saved = await saveUserSearchSettings(next).catch(() => null)
    if (saved) {
      setSettings(saved)
      setSaveState('saved')
    } else {
      setSettings(previous)
      setSaveState('error')
    }
  }

  function toggleMode(mode: SearchMode, checked: boolean) {
    if (!settings) return
    void save({
      ...settings,
      modes: SEARCH_MODES.filter((value) =>
        value === mode ? checked : settings.modes.includes(value),
      ),
    })
  }

  const saving = saveState === 'saving'
  const noneChosen =
    settings !== null && settings.enabled && settings.modes.length === 0

  return (
    <SettingCard
      title="Search in lists"
      description="Let users run searches from the Search panel inside their lists, using the search types ticked below."
      control={
        settings ? (
          <Switch
            aria-label="Search in lists"
            checked={settings.enabled}
            disabled={saving}
            onCheckedChange={(enabled) => void save({ ...settings, enabled })}
          />
        ) : null
      }
    >
      {settings ? (
        <SettingOptions label="Search types users can use">
          {SEARCH_MODES.map((mode) => (
            <SettingOption
              key={mode}
              label={searchModeLabels[mode]}
              hint={searchModeShortHints[mode]}
              checked={settings.modes.includes(mode)}
              disabled={saving || !settings.enabled}
              onChange={(checked) => toggleMode(mode, checked)}
            />
          ))}
        </SettingOptions>
      ) : (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {failed
            ? 'Could not load this setting. Refresh to try again.'
            : 'Loading…'}
        </p>
      )}
      <p
        aria-live="polite"
        className={
          saveState === 'error' || noneChosen
            ? 'text-sm text-destructive empty:hidden'
            : 'text-sm text-muted-foreground empty:hidden'
        }
      >
        {noneChosen
          ? 'No search type is ticked, so users can’t search. Tick at least one, or turn search off.'
          : saveLabels[saveState]}
      </p>
    </SettingCard>
  )
}
