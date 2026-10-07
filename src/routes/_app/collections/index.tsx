import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { DebouncedSearchInput } from '@/components/debounced-search-input'
import { OptionMenu } from '@/components/option-menu'
import type { MenuOption } from '@/components/option-menu'
import { CollectionsTable } from '@/components/collections/collections-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import {
  MAX_COLLECTION_NAME_LENGTH,
  deleteCollection,
  fetchCollections,
} from '@/lib/collections'
import type { Collection } from '@/lib/collections'
import { requireAdmin } from '@/lib/viewer'

type CollectionSort = 'recent' | 'name'

const sortOptions: Array<MenuOption<CollectionSort>> = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'name', label: 'Name A–Z' },
]

export const Route = createFileRoute('/_app/collections/')({
  beforeLoad: requireAdmin,
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; sort?: CollectionSort } => ({
    ...(typeof search.q === 'string' &&
    search.q.trim() !== '' &&
    search.q.length <= MAX_COLLECTION_NAME_LENGTH
      ? { q: search.q.trim() }
      : {}),
    ...(search.sort === 'name' ? { sort: search.sort } : {}),
  }),
  component: Collections,
})

type LoadState = 'loading' | 'ready' | 'error'

function Collections() {
  const { q, sort = 'recent' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [collections, setCollections] = useState<Array<Collection>>([])
  const [state, setState] = useState<LoadState>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchCollections(controller.signal)
      .then((list) => {
        if (list) setCollections(list)
        setState(list ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  async function handleDelete(collection: Collection) {
    setPendingDelete(null)
    setMessage(null)
    try {
      if (await deleteCollection(collection.id)) {
        reload()
        return
      }
    } catch {
      // handled below
    }
    setMessage(`Could not delete ${collection.name}. Please try again.`)
  }

  const visible = useMemo(() => {
    const needle = (q ?? '').toLowerCase()
    const matches = collections.filter((collection) =>
      collection.name.toLowerCase().includes(needle),
    )
    return sort === 'name'
      ? [...matches].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        )
      : matches
  }, [collections, q, sort])

  const isEmpty = state === 'ready' && collections.length === 0

  return (
    <div className="space-y-6">
      {collections.length > 0 ? (
        <div className="space-y-3">
          <DebouncedSearchInput
            value={q}
            label="Search collections"
            placeholder="Search collections by name"
            maxLength={MAX_COLLECTION_NAME_LENGTH}
            onChange={(next) =>
              void navigate({ search: (prev) => ({ ...prev, q: next }) })
            }
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <OptionMenu
              label="Sort by"
              triggerLabel={
                sortOptions.find((option) => option.value === sort)?.label ??
                'Sort'
              }
              options={sortOptions}
              value={sort}
              onChange={(next) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    sort: next === 'name' ? next : undefined,
                  }),
                })
              }
            />
          </div>
        </div>
      ) : null}

      <div
        aria-live="polite"
        className="text-sm text-muted-foreground empty:hidden"
      >
        {state === 'loading' ? 'Loading…' : null}
        {state === 'error' ? 'Could not load collections.' : null}
        {collections.length > 0 && visible.length === 0
          ? 'No collections match this search.'
          : null}
        {message}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <div className="space-y-1">
            <p className="text-sm font-medium">No collections yet</p>
            <p className="text-sm text-muted-foreground">
              Run a search, tick the results worth keeping, and choose Add to
              collection.
            </p>
          </div>
          <Link to="/searches" className={buttonVariants({ size: 'sm' })}>
            Go to Searches
          </Link>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <CollectionsTable
          collections={visible}
          onRenamed={reload}
          onDelete={setPendingDelete}
        />
      ) : null}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDelete?.name ?? 'collection'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The collection is removed for everyone. The people, companies and
              pages in it stay in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) void handleDelete(pendingDelete)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
