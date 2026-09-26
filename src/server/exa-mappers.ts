import { isRecord, numberOrNull, stringOrNull } from '@/server/exa'

export interface PersonDetails {
  firstName: string | null
  lastName: string | null
  location: string | null
  currentTitle: string | null
  currentCompanyName: string | null
  currentCompanyExaId: string | null
  seniority: string | null
}

export interface PositionDetails {
  companyExaId: string | null
  companyName: string | null
  title: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
}

export interface CompanyDetails {
  foundedYear: number | null
  headcount: number | null
  hqAddress: string | null
  hqCity: string | null
  hqCountry: string | null
  revenueAnnual: number | null
  fundingTotal: number | null
  latestRoundName: string | null
  latestRoundDate: string | null
  latestRoundAmount: number | null
  monthlyVisits: number | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const SENIORITY_RULES: Array<[string, RegExp]> = [
  ['founder', /\b(co-?)?founder\b/i],
  ['c_level', /\b(ceo|cto|cfo|coo|cmo|cpo|chief)\b/i],
  ['owner', /\b(owner|partner|president)\b/i],
  ['vp', /\b(vp|vice president|svp|evp)\b/i],
  ['head', /\bhead of\b/i],
  ['director', /\bdirector\b/i],
  ['manager', /\b(manager|lead)\b/i],
]

function dateOrNull(value: unknown): string | null {
  const text = stringOrNull(value)
  return text && DATE_PATTERN.test(text) ? text : null
}

function integerOrNull(value: unknown): number | null {
  const number = numberOrNull(value)
  return number === null ? null : Math.round(number)
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

export function seniorityFromTitle(title: string | null): string | null {
  if (!title) return null
  return SENIORITY_RULES.find(([, pattern]) => pattern.test(title))?.[0] ?? null
}

export function mapPositions(
  properties: Record<string, unknown>,
): Array<PositionDetails> {
  const history = properties.workHistory
  if (!Array.isArray(history)) return []

  return history.flatMap((item: unknown) => {
    if (!isRecord(item)) return []
    const dates = record(item.dates)
    const company = record(item.company)
    const endDate = dateOrNull(dates.to)
    return [
      {
        companyExaId: stringOrNull(company.id),
        companyName: stringOrNull(company.name),
        title: stringOrNull(item.title),
        location: stringOrNull(item.location),
        startDate: dateOrNull(dates.from),
        endDate,
        isCurrent: dates.to === null,
      },
    ]
  })
}

export function mapPerson(
  properties: Record<string, unknown>,
  positions: Array<PositionDetails>,
): PersonDetails {
  const current = positions.find((position) => position.isCurrent)
  const currentTitle = current?.title ?? null
  return {
    firstName: stringOrNull(properties.firstName),
    lastName: stringOrNull(properties.lastName),
    location: stringOrNull(properties.location),
    currentTitle,
    currentCompanyName: current?.companyName ?? null,
    currentCompanyExaId: current?.companyExaId ?? null,
    seniority: seniorityFromTitle(currentTitle),
  }
}

export function mapCompany(
  properties: Record<string, unknown>,
): CompanyDetails {
  const headquarters = record(properties.headquarters)
  const financials = record(properties.financials)
  const latestRound = record(financials.fundingLatestRound)
  const webTraffic = record(properties.webTraffic)
  return {
    foundedYear: integerOrNull(properties.foundedYear),
    headcount: integerOrNull(record(properties.workforce).total),
    hqAddress: stringOrNull(headquarters.address),
    hqCity: stringOrNull(headquarters.city),
    hqCountry: stringOrNull(headquarters.country),
    revenueAnnual: integerOrNull(financials.revenueAnnual),
    fundingTotal: integerOrNull(financials.fundingTotal),
    latestRoundName: stringOrNull(latestRound.name),
    latestRoundDate: dateOrNull(latestRound.date),
    latestRoundAmount: integerOrNull(latestRound.amount),
    monthlyVisits: integerOrNull(webTraffic.visitsMonthly),
  }
}

export function describePerson(person: PersonDetails): string | null {
  const parts = [
    person.currentTitle && person.currentCompanyName
      ? `${person.currentTitle} at ${person.currentCompanyName}`
      : (person.currentTitle ?? person.currentCompanyName),
    person.location,
  ].filter((part) => part !== null && part !== '')
  return parts.length > 0 ? parts.join(' · ') : null
}
