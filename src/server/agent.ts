import { isRecord } from '@/lib/guards'
import { contactKindFor, isAgentRunStatus } from '@/lib/agent'
import type {
  AgentEffort,
  AgentRunStatus,
  ContactKind,
  FieldEvidence,
  FieldEvidenceMap,
} from '@/lib/agent'
import { categoryLabels } from '@/lib/categories'
import type { SearchCategory } from '@/lib/categories'
import type { ColumnDef } from '@/lib/columns'

const AGENT_RUNS_URL = 'https://api.exa.ai/agent/runs'
const REQUEST_TIMEOUT_MS = 20_000
const ITEMS_KEY = 'items'

export interface AgentItem {
  name: string
  url: string | null
  fields: Record<string, unknown>
  evidence: FieldEvidenceMap
}

export interface AgentRunSnapshot {
  id: string
  status: AgentRunStatus
  stopReason: string | null
  items: Array<AgentItem>
  costDollars: number | null
  usage: Record<string, unknown> | null
}

function apiKey(): string {
  const key = process.env.EXA_API_KEY
  if (!key) throw new Error('EXA_API_KEY is not set')
  return key
}

function urlDescription(category: SearchCategory | undefined): string {
  if (category === 'people') return "The person's LinkedIn profile URL"
  if (category === 'company') return "The company's official website URL"
  return 'The main web page URL for this result'
}

const contactDescriptions: Record<ContactKind, string> = {
  email: 'Work email address',
  phone: 'Direct phone number',
}

const contactRequests: Record<ContactKind, string> = {
  email: 'a work email',
  phone: 'a direct phone number',
}

function columnSchema(column: ColumnDef): Record<string, unknown> {
  const contact = contactKindFor(column.key)
  if (contact) {
    return {
      type: 'string',
      format: contact,
      description: contactDescriptions[contact],
    }
  }
  return {
    type: column.type === 'text' ? 'string' : column.type,
    description: column.instruction,
  }
}

export function buildAgentRequest(
  query: string,
  category: SearchCategory | undefined,
  limit: number,
  effort: AgentEffort,
  columns: Array<ColumnDef>,
): Record<string, unknown> {
  const kind = category ? categoryLabels[category].toLowerCase() : 'results'
  const contacts = columns.flatMap((column) => {
    const contact = contactKindFor(column.key)
    return contact ? [contactRequests[contact]] : []
  })
  const contactLine =
    contacts.length > 0 ? ` Include ${contacts.join(' and ')} for each.` : ''
  return {
    query: `${query}\n\nReturn up to ${limit} ${kind}.${contactLine}`,
    effort,
    systemPrompt:
      'Only include items that match the request. Look up contact details when they are requested. Leave out any other field you cannot verify instead of guessing.',
    outputSchema: {
      type: 'object',
      required: [ITEMS_KEY],
      properties: {
        [ITEMS_KEY]: {
          type: 'array',
          maxItems: limit,
          items: {
            type: 'object',
            required: ['name', 'url'],
            properties: {
              name: {
                type: 'string',
                description: 'Name of the person, company, or item',
              },
              url: {
                type: 'string',
                format: 'uri',
                description: urlDescription(category),
              },
              ...Object.fromEntries(
                columns.map((column) => [column.key, columnSchema(column)]),
              ),
            },
          },
        },
      },
    },
  }
}

async function exaFetch(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { 'x-api-key': apiKey(), 'content-type': 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Exa agent request failed with status ${response.status}`)
  }
  return response.json()
}

const GROUNDING_FIELD = /^structured\.items\[(\d+)\](?:\.([a-z0-9_]+))?$/

function itemFieldEvidence(
  fields: Record<string, unknown>,
  own: FieldEvidenceMap,
  item: FieldEvidence | undefined,
): FieldEvidenceMap {
  if (!item) return own
  const evidence: FieldEvidenceMap = { ...own }
  for (const key of Object.keys(fields)) evidence[key] ??= item
  return evidence
}

function parseSnapshot(data: unknown): AgentRunSnapshot {
  if (!isRecord(data) || typeof data.id !== 'string') {
    throw new Error('Unexpected Exa agent response shape')
  }
  const status = isAgentRunStatus(data.status) ? data.status : 'running'
  const output = isRecord(data.output) ? data.output : {}
  const structured = isRecord(output.structured) ? output.structured : {}
  const rawItems = Array.isArray(structured[ITEMS_KEY])
    ? structured[ITEMS_KEY]
    : []

  const evidenceByIndex = new Map<number, FieldEvidenceMap>()
  const itemEvidence = new Map<number, FieldEvidence>()
  if (Array.isArray(output.grounding)) {
    for (const entry of output.grounding) {
      if (!isRecord(entry) || typeof entry.field !== 'string') continue
      const match = GROUNDING_FIELD.exec(entry.field)
      if (!match?.[1]) continue
      const index = Number(match[1])
      const found: FieldEvidence = {
        confidence:
          typeof entry.confidence === 'string' ? entry.confidence : null,
        citations: Array.isArray(entry.citations)
          ? entry.citations.flatMap((citation: unknown) =>
              isRecord(citation) && typeof citation.url === 'string'
                ? [
                    {
                      url: citation.url,
                      title:
                        typeof citation.title === 'string'
                          ? citation.title
                          : null,
                    },
                  ]
                : [],
            )
          : [],
      }
      if (match[2]) {
        evidenceByIndex.set(index, {
          ...evidenceByIndex.get(index),
          [match[2]]: found,
        })
      } else {
        itemEvidence.set(index, found)
      }
    }
  }

  const items = rawItems.flatMap(
    (raw: unknown, index: number): Array<AgentItem> => {
      if (
        !isRecord(raw) ||
        typeof raw.name !== 'string' ||
        raw.name.trim() === ''
      ) {
        return []
      }
      return [
        {
          name: raw.name.trim(),
          url: typeof raw.url === 'string' ? raw.url : null,
          fields: raw,
          evidence: itemFieldEvidence(
            raw,
            evidenceByIndex.get(index) ?? {},
            itemEvidence.get(index),
          ),
        },
      ]
    },
  )

  const cost = isRecord(data.costDollars) ? data.costDollars.total : null
  return {
    id: data.id,
    status,
    stopReason: typeof data.stopReason === 'string' ? data.stopReason : null,
    items,
    costDollars: typeof cost === 'number' ? cost : null,
    usage: isRecord(data.usage) ? data.usage : null,
  }
}

export async function createAgentRun(
  request: Record<string, unknown>,
): Promise<AgentRunSnapshot> {
  return parseSnapshot(
    await exaFetch(AGENT_RUNS_URL, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
  )
}

export async function getAgentRun(id: string): Promise<AgentRunSnapshot> {
  return parseSnapshot(
    await exaFetch(`${AGENT_RUNS_URL}/${encodeURIComponent(id)}`),
  )
}
