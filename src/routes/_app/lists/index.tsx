import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ListCard } from '@/components/lists/list-card'
import { ListNameDialog } from '@/components/lists/list-name-dialog'
import { SegmentedControl } from '@/components/segmented-control'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createList,
  deleteList,
  fetchLists,
  isListScope,
  renameList,
} from '@/lib/lists'
import type { List, ListScope } from '@/lib/lists'
import { isAdmin } from '@/lib/viewer'

export const Route = createFileRoute('/_app/lists/')({
  validateSearch: (search: Record<string, unknown>): { scope?: ListScope } =>
    isListScope(search.scope) && search.scope !== 'mine'
      ? { scope: search.scope }
      : {},
  component: Lists,
})

type LoadState = 'loading' | 'ready' | 'error'

const gridClass = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'

function Lists() {
  const { scope = 'mine' } = Route.useSearch()
  const { viewer } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const [lists, setLists] = useState<Array<List>>([])
  const [state, setState] = useState<LoadState>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<List | null>(null)
  const [pendingDelete, setPendingDelete] = useState<List | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    fetchLists(scope, controller.signal)
      .then((result) => {
        if (result) setLists(result)
        setState(result ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [scope, reloadKey])

  const ownNames = lists.filter((list) => list.isOwner).map((list) => list.name)
  const reload = () => setReloadKey((key) => key + 1)

  async function handleDelete(list: List) {
    setPendingDelete(null)
    setMessage(null)
    try {
      if (await deleteList(list.id)) {
        reload()
        return
      }
    } catch {
      // handled below
    }
    setMessage(`Could not delete ${list.name}. Please try again.`)
  }

  const newListButton = (
    <Button type="button" onClick={() => setCreating(true)}>
      <Plus />
      New list
    </Button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAdmin(viewer) ? (
          <SegmentedControl
            label="Show lists"
            value={scope}
            options={[
              { value: 'mine', label: 'My lists' },
              { value: 'all', label: 'Everyone’s lists' },
            ]}
            onChange={(next) =>
              void navigate({
                search: next === 'all' ? { scope: next } : {},
              })
            }
          />
        ) : (
          <span />
        )}
        {newListButton}
      </div>

      <div
        aria-live="polite"
        className="text-sm text-muted-foreground empty:hidden"
      >
        {state === 'error' ? 'Could not load your lists.' : null}
        {message}
      </div>

      {state === 'loading' && lists.length === 0 ? (
        <div className={gridClass}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-28 rounded-xl motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : null}

      {state === 'ready' && lists.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border p-10 text-center">
          <div className="space-y-1">
            <p className="text-sm font-medium">No lists yet</p>
            <p className="text-sm text-muted-foreground">
              Create a list to collect and track the people and companies you
              are working with.
            </p>
          </div>
          {newListButton}
        </div>
      ) : null}

      {lists.length > 0 ? (
        <div className={gridClass}>
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onRename={setRenaming}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      ) : null}

      <ListNameDialog
        open={creating}
        title="New list"
        description="Give your list a name. You can rename it later."
        submitLabel="Create list"
        takenNames={ownNames}
        onOpenChange={setCreating}
        onSubmit={createList}
        onSaved={(list) =>
          void navigate({
            to: '/lists/$listId',
            params: { listId: list.id },
          })
        }
      />

      <ListNameDialog
        key={renaming?.id ?? 'none'}
        open={renaming !== null}
        title="Rename list"
        description="Only you see your lists, so the name just needs to make sense to you."
        submitLabel="Save"
        initialName={renaming?.name ?? ''}
        takenNames={ownNames}
        onOpenChange={(open) => {
          if (!open) setRenaming(null)
        }}
        onSubmit={(name) =>
          renaming
            ? renameList(renaming.id, name)
            : Promise.resolve({ status: 'error' })
        }
        onSaved={reload}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDelete?.name ?? 'list'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The list and its tracking columns are removed. The people and
              companies in it stay in the database.
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
