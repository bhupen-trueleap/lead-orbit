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
import {
  SEARCH_CALL_PRICE,
  agentEffortLabels,
  contactPrices,
  estimateAgentCost,
  formatDollars,
} from '@/lib/agent'
import type { ColumnDef } from '@/lib/columns'
import type { SearchRequest } from '@/lib/search'

interface AgentCostDialogProps {
  request: SearchRequest | null
  columns: Array<ColumnDef>
  onConfirm: (request: SearchRequest) => void
  onCancel: () => void
}

const contactLabels = { email: 'Email lookups', phone: 'Phone lookups' }

export function AgentCostDialog({
  request,
  columns,
  onConfirm,
  onCancel,
}: AgentCostDialogProps) {
  const chosen = new Set(request?.columns ?? [])
  const keys = columns
    .filter((column) => chosen.has(column.id))
    .map((column) => column.key)
  const estimate = request
    ? estimateAgentCost(request.effort, request.limit, keys)
    : null

  return (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Run agent search?</AlertDialogTitle>
          <AlertDialogDescription>
            The agent builds a verified list and can take a few minutes. You can
            leave the page; the results will be in Recent searches.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {request && estimate ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {agentEffortLabels[request.effort]} effort
              </dt>
              <dd className="tabular-nums">{formatDollars(estimate.base)}</dd>
            </div>
            {estimate.contacts.map((item) => (
              <div key={item.kind} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {contactLabels[item.kind]} (up to {item.count} ×{' '}
                  {formatDollars(contactPrices[item.kind])})
                </dt>
                <dd className="tabular-nums">{formatDollars(item.cost)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t pt-1.5 font-medium">
              <dt>Up to</dt>
              <dd className="tabular-nums">{formatDollars(estimate.total)}</dd>
            </div>
            <p className="text-xs text-muted-foreground">
              Plus {formatDollars(SEARCH_CALL_PRICE)} for each web search the
              agent makes.
            </p>
          </dl>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={() => {
              if (request) onConfirm(request)
            }}
          >
            Run agent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
