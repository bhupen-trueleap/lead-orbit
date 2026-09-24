import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { SavedSearchesTable } from '@/components/search/saved-searches-table'
import { deleteSavedSearch, listSavedSearches } from '@/lib/saved-searches'
import type { SavedSearch } from '@/lib/saved-searches'

export const Route = createFileRoute('/saved-searches')({
  component: SavedSearches,
})

type LoadState = 'loading' | 'ready' | 'error'

function SavedSearches() {
  const [savedSearches, setSavedSearches] = useState<Array<SavedSearch>>([])
  const [state, setState] = useState<LoadState>('loading')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listSavedSearches(controller.signal)
      .then((items) => {
        if (items) {
          setSavedSearches(items)
          setState('ready')
        } else {
          setState('error')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [])

  async function handleDelete(id: string) {
    setMessage(null)
    try {
      if (await deleteSavedSearch(id)) {
        setSavedSearches((current) => current.filter((item) => item.id !== id))
        return
      }
    } catch {
      // handled below
    }
    setMessage('Could not delete the saved search. Please try again.')
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-semibold">Saved Searches</h1>
        <div aria-live="polite" className="text-sm text-muted-foreground">
          {state === 'loading' ? 'Loading…' : null}
          {state === 'error' ? 'Could not load saved searches.' : null}
          {state === 'ready' && savedSearches.length === 0
            ? 'No saved searches yet. Save a search from the Searches page.'
            : null}
          {message}
        </div>
        {savedSearches.length > 0 ? (
          <SavedSearchesTable
            savedSearches={savedSearches}
            onDelete={(id) => void handleDelete(id)}
          />
        ) : null}
      </div>
    </AppShell>
  )
}
