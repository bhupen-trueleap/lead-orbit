export type ResultCount = 10 | 25 | 50 | 100

export const RESULT_COUNTS: ReadonlyArray<ResultCount> = [10, 25, 50, 100]

export const DEFAULT_PAGE_SIZE: ResultCount = 25

export const MAX_PAGE = 100_000

export function isResultCount(value: unknown): value is ResultCount {
  return RESULT_COUNTS.some((count) => count === value)
}

export function isPage(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_PAGE
  )
}
