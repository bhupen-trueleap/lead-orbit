import { Link } from '@tanstack/react-router'
import { Folder, FolderPlus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  MAX_COLLECTION_NAME_LENGTH,
  addCollectionItems,
  createCollection,
  fetchCollections,
  parseCollectionName,
} from '@/lib/collections'
import type { Collection } from '@/lib/collections'

interface AddToCollectionProps {
  ids: Array<string>
  isSelection: boolean
  onAdded: () => void
}

interface Outcome {
  collection: Pick<Collection, 'id' | 'name'>
  added: number
  alreadyIn: number
}

function describeOutcome({ added, alreadyIn }: Outcome): string {
  if (added === 0) return 'Already in'
  return alreadyIn > 0
    ? `Added ${added}, ${alreadyIn} already in`
    : `Added ${added} to`
}

export function AddToCollection({
  ids,
  isSelection,
  onAdded,
}: AddToCollectionProps) {
  const [open, setOpen] = useState(false)
  const [collections, setCollections] = useState<Array<Collection> | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setError(null)
    fetchCollections(controller.signal)
      .then((list) => {
        if (list) setCollections(list)
        else setError('Could not load collections.')
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load collections.')
      })
    return () => controller.abort()
  }, [open])

  async function addTo(collection: Pick<Collection, 'id' | 'name'>) {
    const result = await addCollectionItems(collection.id, ids)
    if (!result) {
      setError(`Could not add to ${collection.name}. Try again.`)
      return
    }
    setOutcome({ collection, ...result })
    setName('')
    setOpen(false)
    onAdded()
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function createAndAdd() {
    const parsed = parseCollectionName(name)
    if (!parsed) return
    const created = await createCollection(parsed)
    if (created.status === 'duplicate') {
      setError(`"${parsed}" already exists. Reopen to pick it from the list.`)
      return
    }
    if (created.status === 'error') {
      setError('Could not create the collection. Try again.')
      return
    }
    await addTo(created.collection)
  }

  const count = ids.length
  const parsedName = parseCollectionName(name)
  const needle = (parsedName ?? '').toLowerCase()
  const existing = needle
    ? collections?.find((item) => item.name.toLowerCase() === needle)
    : undefined
  const matches = (collections ?? []).filter((item) =>
    item.name.toLowerCase().includes(needle),
  )
  const label = isSelection
    ? `Add ${count} to collection`
    : 'Add all to collection'

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" size="sm" />}
        >
          <FolderPlus />
          {label}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
          <PopoverHeader>
            <PopoverTitle>
              Add {count} {count === 1 ? 'result' : 'results'} to a collection
            </PopoverTitle>
          </PopoverHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void run(createAndAdd)
            }}
          >
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder="Name a new collection or find one"
              aria-label="Collection name"
              aria-invalid={existing !== undefined}
              aria-describedby="collection-name-hint"
              maxLength={MAX_COLLECTION_NAME_LENGTH}
              disabled={busy}
            />
            <Button
              type="submit"
              disabled={busy || parsedName === null || existing !== undefined}
            >
              <Plus />
              Create
            </Button>
          </form>
          <p
            id="collection-name-hint"
            aria-live="polite"
            className="text-xs text-muted-foreground empty:hidden"
          >
            {existing ? (
              <span className="text-destructive">
                “{existing.name}” already exists. Pick it below to add to it.
              </span>
            ) : parsedName ? (
              `Create “${parsedName}” and add ${count === 1 ? 'this result' : `these ${count} results`}.`
            ) : null}
          </p>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {collections === null ? (
            error ? null : (
              <p className="text-xs text-muted-foreground">Loading…</p>
            )
          ) : collections.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No collections yet. Name the first one above.
            </p>
          ) : (
            <div className="space-y-1 border-t pt-2.5">
              <p className="text-xs text-muted-foreground">
                {needle
                  ? `${matches.length} of ${collections.length} collections match`
                  : 'Or add to an existing collection'}
              </p>
              <ul className="-mx-1 max-h-56 overflow-y-auto">
                {matches.map((collection) => (
                  <li key={collection.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => addTo(collection))}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-hidden hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                        collection.id === existing?.id && 'bg-muted',
                      )}
                    >
                      <Folder className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {collection.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {collection.itemCount}{' '}
                        {collection.itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <p
        aria-live="polite"
        className="basis-full text-xs text-muted-foreground empty:hidden"
      >
        {outcome ? (
          <>
            {describeOutcome(outcome)}{' '}
            <Link
              to="/collections/$collectionId"
              params={{ collectionId: outcome.collection.id }}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {outcome.collection.name}
            </Link>
          </>
        ) : null}
      </p>
    </>
  )
}
