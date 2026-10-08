import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Search } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import type { ComponentProps, ComponentType } from 'react'

import { UserMenu } from '@/components/layout/user-menu'
import { ListSearchPanel } from '@/components/lists/list-search-panel'
import { WorkbookFileActions } from '@/components/lists/workbook-file-actions'
import type ListWorkbookComponent from '@/components/lists/list-workbook'
import type {
  SaveState,
  WorkbookHandle,
} from '@/components/lists/list-workbook'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchList, fetchWorkbook, saveWorkbook } from '@/lib/lists'
import type { List, WorkbookSnapshot } from '@/lib/lists'
import type { SearchMode } from '@/lib/search'
import { allowedSearchModes, fetchUserSearchSettings } from '@/lib/settings'

export const Route = createFileRoute('/_sheet/lists/$listId')({
  component: ListEditor,
})

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

const ListWorkbook = lazy(
  (): Promise<{
    default: ComponentType<ComponentProps<typeof ListWorkbookComponent>>
  }> =>
    import.meta.env.SSR
      ? Promise.resolve({ default: () => null })
      : import('@/components/lists/list-workbook'),
)

const saveLabels: Record<SaveState, string> = {
  saved: 'All changes saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Could not save',
}

function ListEditor() {
  const { listId } = Route.useParams()
  const { viewer } = Route.useRouteContext()
  const [list, setList] = useState<List | null>(null)
  const [snapshot, setSnapshot] = useState<WorkbookSnapshot | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchModes, setSearchModes] = useState<Array<SearchMode>>(
    allowedSearchModes(viewer.role, { enabled: false, modes: [] }),
  )
  const [handle, setHandle] = useState<WorkbookHandle | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (viewer.role === 'admin') return
    const controller = new AbortController()
    fetchUserSearchSettings(controller.signal)
      .then((settings) => {
        if (settings) setSearchModes(allowedSearchModes(viewer.role, settings))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [viewer.role])

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    Promise.all([
      fetchList(listId, controller.signal),
      fetchWorkbook(listId, controller.signal),
    ])
      .then(([listResult, workbookResult]) => {
        if (listResult === 'missing' || workbookResult === 'missing') {
          setState('missing')
          return
        }
        setList(listResult)
        setSnapshot(workbookResult)
        setState(listResult && workbookResult ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [listId])

  const handleSave = useCallback(
    (workbook: Record<string, unknown>, rowCount: number) =>
      saveWorkbook(listId, workbook, rowCount),
    [listId],
  )

  const canEdit = snapshot?.canEdit ?? false

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/lists" />}
        >
          <ArrowLeft />
          <span className="hidden sm:inline">Lists</span>
        </Button>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          {list ? (
            <h1 className="truncate text-sm font-medium">{list.name}</h1>
          ) : (
            <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
          )}
          {list && !list.isOwner ? (
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              {list.ownerEmail} · View only
            </span>
          ) : null}
          {notice ? (
            <span
              aria-live="polite"
              className="min-w-0 truncate text-xs text-muted-foreground"
            >
              {notice}
            </span>
          ) : canEdit ? (
            <span
              aria-live="polite"
              className={
                saveState === 'error'
                  ? 'shrink-0 text-xs text-destructive'
                  : 'hidden shrink-0 text-xs text-muted-foreground sm:inline'
              }
            >
              {saveLabels[saveState]}
            </span>
          ) : null}
        </div>
        {list ? (
          <WorkbookFileActions
            handle={handle}
            canEdit={canEdit}
            listName={list.name}
            onNotice={setNotice}
          />
        ) : null}
        {list && searchModes.length > 0 ? (
          <Button
            type="button"
            variant={searchOpen ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search />
            Search
          </Button>
        ) : null}
        <UserMenu email={viewer.email} />
      </header>

      {state === 'missing' || state === 'error' ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {state === 'missing'
            ? 'This list doesn’t exist, or it belongs to someone else.'
            : 'Could not load this list. Refresh to try again.'}
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            {list && snapshot && mounted ? (
              <Suspense
                fallback={
                  <Skeleton className="h-full w-full rounded-none motion-reduce:animate-none" />
                }
              >
                <ListWorkbook
                  listId={list.id}
                  name={list.name}
                  workbook={snapshot.workbook}
                  canEdit={canEdit}
                  onSave={handleSave}
                  onSaveStateChange={setSaveState}
                  onReady={setHandle}
                />
              </Suspense>
            ) : (
              <Skeleton className="h-full w-full rounded-none motion-reduce:animate-none" />
            )}
          </div>
          {searchOpen && searchModes.length > 0 ? (
            <div className="absolute inset-0 z-20 md:static md:w-[26rem] md:shrink-0">
              <ListSearchPanel
                handle={handle}
                canEdit={canEdit}
                modes={searchModes}
                onClose={() => setSearchOpen(false)}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
