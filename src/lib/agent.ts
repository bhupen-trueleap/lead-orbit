import { isRecord } from '@/lib/guards'

export type AgentEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

export const AGENT_EFFORTS: ReadonlyArray<AgentEffort> = [
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
]

export const DEFAULT_AGENT_EFFORT: AgentEffort = 'minimal'

export const agentEffortPrices: Record<AgentEffort, number> = {
  minimal: 0.012,
  low: 0.025,
  medium: 0.1,
  high: 0.5,
  xhigh: 1,
}

export const agentEffortLabels: Record<AgentEffort, string> = {
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
}

export type ContactKind = 'email' | 'phone'

export const contactPrices: Record<ContactKind, number> = {
  email: 0.02,
  phone: 0.07,
}

export const SEARCH_CALL_PRICE = 0.005

export function contactKindFor(columnKey: string): ContactKind | null {
  if (columnKey === 'email') return 'email'
  if (columnKey === 'phone') return 'phone'
  return null
}

export function isAgentEffort(value: unknown): value is AgentEffort {
  return AGENT_EFFORTS.some((effort) => effort === value)
}

export interface AgentCostEstimate {
  base: number
  contacts: Array<{ kind: ContactKind; count: number; cost: number }>
  total: number
}

export function estimateAgentCost(
  effort: AgentEffort,
  limit: number,
  columnKeys: Array<string>,
): AgentCostEstimate {
  const base = agentEffortPrices[effort]
  const contacts = columnKeys.flatMap((key) => {
    const kind = contactKindFor(key)
    return kind
      ? [{ kind, count: limit, cost: limit * contactPrices[kind] }]
      : []
  })
  const total = contacts.reduce((sum, item) => sum + item.cost, base)
  return { base, contacts, total }
}

export function formatDollars(value: number): string {
  return value < 1
    ? `$${value.toFixed(3).replace(/0$/, '')}`
    : `$${value.toFixed(2)}`
}

export type AgentRunStatus =
  'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export function isAgentRunStatus(value: unknown): value is AgentRunStatus {
  return (
    value === 'queued' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'cancelled'
  )
}

export function isFinalStatus(status: AgentRunStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

export interface FieldEvidence {
  confidence: string | null
  citations: Array<{ url: string; title: string | null }>
}

export type FieldEvidenceMap = Partial<Record<string, FieldEvidence>>

export function parseFieldEvidence(value: unknown): FieldEvidenceMap {
  if (!isRecord(value)) return {}
  const evidence: FieldEvidenceMap = {}
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item) || !Array.isArray(item.citations)) continue
    evidence[key] = {
      confidence: typeof item.confidence === 'string' ? item.confidence : null,
      citations: item.citations.flatMap((citation: unknown) =>
        isRecord(citation) && typeof citation.url === 'string'
          ? [
              {
                url: citation.url,
                title:
                  typeof citation.title === 'string' ? citation.title : null,
              },
            ]
          : [],
      ),
    }
  }
  return evidence
}
