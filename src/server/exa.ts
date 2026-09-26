const EXA_SEARCH_URL = 'https://api.exa.ai/search'
const REQUEST_TIMEOUT_MS = 20_000
const TEXT_MAX_CHARACTERS = 2_000

export type ExaCategory = 'company' | 'people'

export interface ExaEntity {
  id: string
  type: string
  version: number | null
  properties: Record<string, unknown>
}

export interface ExaResult {
  id: string
  url: string
  title: string | null
  author: string | null
  publishedDate: string | null
  image: string | null
  favicon: string | null
  text: string | null
  highlights: Array<string>
  entities: Array<ExaEntity>
}

export interface ExaSearchResponse {
  request: Record<string, unknown>
  requestId: string | null
  resolvedSearchType: string | null
  costDollars: number | null
  searchTimeMs: number | null
  results: Array<ExaResult>
}

interface ExaSearchOptions {
  query: string
  category?: ExaCategory
  numResults: number
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

export function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseEntity(raw: unknown): ExaEntity | null {
  if (!isRecord(raw) || !isRecord(raw.properties)) return null
  const id = stringOrNull(raw.id)
  const type = stringOrNull(raw.type)
  if (!id || !type) return null
  return {
    id,
    type,
    version: numberOrNull(raw.version),
    properties: raw.properties,
  }
}

function parseResult(raw: unknown): ExaResult | null {
  if (!isRecord(raw)) return null
  const url = stringOrNull(raw.url)
  if (!url) return null
  return {
    id: stringOrNull(raw.id) ?? url,
    url,
    title: stringOrNull(raw.title),
    author: stringOrNull(raw.author),
    publishedDate: stringOrNull(raw.publishedDate),
    image: stringOrNull(raw.image),
    favicon: stringOrNull(raw.favicon),
    text: stringOrNull(raw.text),
    highlights: Array.isArray(raw.highlights)
      ? raw.highlights.filter((item) => typeof item === 'string')
      : [],
    entities: Array.isArray(raw.entities)
      ? raw.entities.flatMap((item: unknown) => {
          const entity = parseEntity(item)
          return entity ? [entity] : []
        })
      : [],
  }
}

export async function searchExa({
  query,
  category,
  numResults,
}: ExaSearchOptions): Promise<ExaSearchResponse> {
  const apiKey = process.env.EXA_API_KEY

  if (!apiKey) {
    throw new Error('EXA_API_KEY is not set')
  }

  const request: Record<string, unknown> = {
    query,
    type: 'auto',
    numResults,
    ...(category ? { category } : {}),
    contents: {
      highlights: true,
      text: { maxCharacters: TEXT_MAX_CHARACTERS },
    },
  }

  const response = await fetch(EXA_SEARCH_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Exa request failed with status ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new Error('Unexpected Exa response shape')
  }

  return {
    request,
    requestId: stringOrNull(data.requestId),
    resolvedSearchType: stringOrNull(data.resolvedSearchType),
    costDollars: isRecord(data.costDollars)
      ? numberOrNull(data.costDollars.total)
      : null,
    searchTimeMs: numberOrNull(data.searchTime),
    results: data.results.flatMap((raw: unknown) => {
      const result = parseResult(raw)
      return result ? [result] : []
    }),
  }
}
