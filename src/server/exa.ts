import { isRecord } from '@/lib/guards'
import type { SearchMode } from '@/lib/search'
import { exaCategoryNames } from '@/lib/categories'
import type { SearchCategory } from '@/lib/categories'

const EXA_SEARCH_URL = 'https://api.exa.ai/search'
export type WebSearchMode = Exclude<SearchMode, 'agent'>

const REQUEST_TIMEOUTS_MS: Record<WebSearchMode, number> = {
  fast: 10_000,
  auto: 20_000,
  deep: 45_000,
}
const CONTENT_MAX_AGE_HOURS = 24
const TEXT_MAX_CHARACTERS = 2_000

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
  extracted: Record<string, unknown>
}

interface ExaSearchOptions {
  query: string
  category?: SearchCategory
  numResults: number
  mode: WebSearchMode
  summary?: Record<string, unknown>
}

function parseExtracted(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value
  if (typeof value !== 'string') return {}
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
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
    extracted: parseExtracted(raw.summary),
  }
}

export async function searchExa({
  query,
  category,
  numResults,
  mode,
  summary,
}: ExaSearchOptions): Promise<Array<ExaResult>> {
  const apiKey = process.env.EXA_API_KEY

  if (!apiKey) {
    throw new Error('EXA_API_KEY is not set')
  }

  const request: Record<string, unknown> = {
    query,
    type: mode,
    numResults,
    ...(category ? { category: exaCategoryNames[category] } : {}),
    contents: {
      maxAgeHours: CONTENT_MAX_AGE_HOURS,
      highlights: true,
      text: { maxCharacters: TEXT_MAX_CHARACTERS },
      ...(summary ? { summary } : {}),
    },
  }

  const response = await fetch(EXA_SEARCH_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(REQUEST_TIMEOUTS_MS[mode]),
  })

  if (!response.ok) {
    throw new Error(`Exa request failed with status ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new Error('Unexpected Exa response shape')
  }

  return data.results.flatMap((raw: unknown) => {
    const result = parseResult(raw)
    return result ? [result] : []
  })
}
