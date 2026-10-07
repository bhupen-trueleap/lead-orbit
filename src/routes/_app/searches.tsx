import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Download, Maximize2, Minimize2, Telescope } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AddToCollection } from '@/components/search/add-to-collection'
import { EntityTable } from '@/components/search/entity-table'
import { AgentProgress } from '@/components/search/agent-progress'
import { SearchBox } from '@/components/search/search-box'
import { SplitPane } from '@/components/split-pane'
import { TableCard } from '@/components/table-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { TablePagination } from '@/components/table-pagination'
import {
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_MODE,
  isSearchCategory,
  isSearchMode,
  isSearchLimit,
} from '@/lib/search'
import type { SearchCategory, SearchMode } from '@/lib/search'
import { useSearch } from '@/lib/use-search'
import {
  csvFileName,
  downloadCsv,
  entityCsvHeader,
  entityCsvRow,
  toCsv,
} from '@/lib/csv'
import { columnIdsFromParam, isUuid } from '@/lib/columns'
import { DEFAULT_AGENT_EFFORT, isAgentEffort } from '@/lib/agent'
import type { AgentEffort } from '@/lib/agent'
import { DEFAULT_PAGE_SIZE, RESULT_COUNTS } from '@/lib/pagination'
import type { ResultCount } from '@/lib/pagination'
import { requireAdmin } from '@/lib/viewer'

export const Route = createFileRoute('/_app/searches')({
  beforeLoad: requireAdmin,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    q?: string
    category?: SearchCategory
    limit?: number
    mode?: SearchMode
    effort?: AgentEffort
    columns?: string
    run?: string
  } => ({
    ...(typeof search.q === 'string' ? { q: search.q } : {}),
    ...(isSearchCategory(search.category) ? { category: search.category } : {}),
    ...(isSearchLimit(search.limit) ? { limit: search.limit } : {}),
    ...(isSearchMode(search.mode) ? { mode: search.mode } : {}),
    ...(isAgentEffort(search.effort) ? { effort: search.effort } : {}),
    ...(isUuid(search.run) ? { run: search.run } : {}),
    ...(typeof search.columns === 'string' && search.columns !== ''
      ? { columns: search.columns }
      : {}),
  }),
  component: Searches,
})

function Searches() {
  const {
    q,
    category,
    limit,
    mode,
    effort,
    columns: columnParam,
    run,
  } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const urlColumns = useMemo(
    () => columnIdsFromParam(columnParam),
    [columnParam],
  )
  const {
    entities,
    columns,
    status,
    message,
    request,
    agent,
    startedAt,
    search,
    resume,
  } = useSearch()
  const startedRef = useRef(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<ResultCount>(DEFAULT_PAGE_SIZE)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  function revealResults() {
    const results = resultsRef.current
    if (!results) return
    const { top } = results.getBoundingClientRect()
    if (top < window.innerHeight * 0.6) return
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    results.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const confirmOnLoad = !run && mode === 'agent'

  useEffect(() => {
    if (startedRef.current) return
    if (run) {
      startedRef.current = true
      void resume(run)
    } else if (q && mode !== 'agent') {
      startedRef.current = true
      void search({
        query: q,
        category,
        limit: limit ?? DEFAULT_SEARCH_LIMIT,
        mode: mode ?? DEFAULT_SEARCH_MODE,
        effort: DEFAULT_AGENT_EFFORT,
        columns: urlColumns,
      })
    }
  }, [q, category, limit, mode, urlColumns, run, search, resume])

  const agentSearchId = agent?.searchId
  useEffect(() => {
    if (!agentSearchId || agentSearchId === run) return
    void navigate({
      search: (prev) => ({ ...prev, run: agentSearchId }),
      replace: true,
    })
  }, [agentSearchId, run, navigate])

  const isSearching = status === 'searching'
  const lastPage = Math.max(1, Math.ceil(entities.length / pageSize))
  const currentPage = Math.min(page, lastPage)
  const pageStart = (currentPage - 1) * pageSize
  const visibleEntities = entities.slice(pageStart, pageStart + pageSize)
  const selectedEntityIds = entities
    .filter((entity) => selectedIds.has(entity.id))
    .map((entity) => entity.id)
  const hasSelection = selectedEntityIds.length > 0

  const searchPanel = (
    <div className="space-y-5">
      <SearchBox
        layout="panel"
        placeholder="Describe who or what you are looking for, e.g. fintech founders in Singapore"
        defaultQuery={q}
        defaultCategory={category}
        defaultLimit={limit}
        defaultMode={mode}
        defaultEffort={effort}
        defaultColumns={urlColumns}
        isSearching={isSearching}
        confirmOnLoad={confirmOnLoad}
        onSearch={(next) => {
          setPage(1)
          setSelectedIds(new Set())
          if (run) {
            void navigate({
              search: (prev) => ({ ...prev, run: undefined }),
              replace: true,
            })
          }
          void search(next)
          requestAnimationFrame(revealResults)
        }}
      />
      {isSearching || message ? (
        <div aria-live="polite" className="space-y-1 border-t pt-4 text-sm">
          {isSearching && agent && startedAt !== null ? (
            <AgentProgress status={agent.status} startedAt={startedAt} />
          ) : isSearching ? (
            <p className="text-muted-foreground">Searching…</p>
          ) : null}
          {message ? <p className="text-muted-foreground">{message}</p> : null}
        </div>
      ) : null}
    </div>
  )

  const hasResults = entities.length > 0
  const showCard = hasResults || isSearching
  const resultsTitle = isSearching
    ? 'Searching…'
    : hasSelection
      ? `${selectedEntityIds.length} of ${entities.length} selected`
      : `${entities.length} ${entities.length === 1 ? 'result' : 'results'}`

  const renderCard = (inModal: boolean) => (
    <TableCard
      bare={inModal}
      title={
        inModal ? (
          <div className="min-w-0">
            <DialogTitle className="truncate text-base">
              {request?.query ?? q ?? 'Search results'}
            </DialogTitle>
            <p className="text-xs font-normal text-muted-foreground">
              {resultsTitle}
            </p>
          </div>
        ) : (
          resultsTitle
        )
      }
      actions={
        <>
          {!isSearching && hasResults ? (
            <>
              <AddToCollection
                ids={
                  hasSelection
                    ? selectedEntityIds
                    : entities.map((entity) => entity.id)
                }
                isSelection={hasSelection}
                onAdded={() => setSelectedIds(new Set())}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    csvFileName(request?.query ?? q ?? 'search'),
                    toCsv([
                      entityCsvHeader(columns),
                      ...entities.map((entity) =>
                        entityCsvRow(entity, columns),
                      ),
                    ]),
                  )
                }
              >
                <Download />
                Export CSV
              </Button>
            </>
          ) : null}
          {inModal ? (
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close expanded results"
                  title="Close expanded results"
                />
              }
            >
              <Minimize2 />
            </DialogClose>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Expand results"
              title="Expand results"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 />
            </Button>
          )}
        </>
      }
      footer={
        hasResults ? (
          <TablePagination
            page={currentPage}
            pageSize={pageSize}
            pageSizes={RESULT_COUNTS}
            total={entities.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        ) : null
      }
    >
      <EntityTable
        flush
        entities={visibleEntities}
        columns={columns}
        isLoading={isSearching}
        startIndex={pageStart}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </TableCard>
  )

  const resultsPanel = showCard ? (
    renderCard(false)
  ) : (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center @3xl:min-h-[calc(100svh-8.5rem)]">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Telescope aria-hidden="true" className="size-4.5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {status === 'done'
            ? 'No results found'
            : 'Run a search to see results'}
        </p>
        <p className="text-xs text-muted-foreground">
          {status === 'done'
            ? 'Try different wording or a deeper search'
            : 'Press ↵ to search · results stream in live'}
        </p>
      </div>
    </div>
  )

  return (
    <SplitPane
      label="Search panel"
      storageKey="leadorbit.search-panel-share"
      left={searchPanel}
      right={
        <div ref={resultsRef} className="scroll-mt-4">
          {resultsPanel}
          <Dialog open={expanded && showCard} onOpenChange={setExpanded}>
            <DialogContent size="screen">{renderCard(true)}</DialogContent>
          </Dialog>
        </div>
      }
    />
  )
}
