const EXA_SEARCH_URL = 'https://api.exa.ai/search'
const REQUEST_TIMEOUT_MS = 15_000

export type ExaCategory = 'company' | 'people'

export interface ExaResult {
  id: string
  title: string
  url: string
  author: string | null
  publishedDate: string | null
  highlights: Array<string>
}

interface ExaSearchOptions {
  query: string
  category?: ExaCategory
  numResults?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function parseResult(raw: unknown): ExaResult | null {
  if (!isRecord(raw)) return null
  const url = stringOrNull(raw.url)
  if (!url) return null
  const highlights = Array.isArray(raw.highlights)
    ? raw.highlights.filter((item) => typeof item === 'string')
    : []
  return {
    id: stringOrNull(raw.id) ?? url,
    title: stringOrNull(raw.title) ?? url,
    url,
    author: stringOrNull(raw.author),
    publishedDate: stringOrNull(raw.publishedDate),
    highlights,
  }
}

export async function searchExa({
  query,
  category,
  numResults = 10,
}: ExaSearchOptions): Promise<Array<ExaResult>> {
  const apiKey = process.env.EXA_API_KEY

  if (!apiKey) {
    throw new Error('EXA_API_KEY is not set')
  }

  const response = await fetch(EXA_SEARCH_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      query,
      type: 'auto',
      numResults,
      category,
      contents: { highlights: true },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Exa request failed with status ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new Error('Unexpected Exa response shape')
  }

  return data.results.flatMap((raw) => {
    const result = parseResult(raw)
    return result ? [result] : []
  })
}
