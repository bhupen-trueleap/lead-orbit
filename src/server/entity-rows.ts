import { sql } from 'drizzle-orm'

import { companies, entities, people, webPages } from '@/db/schema'
import type { SearchEntity, SearchSource } from '@/lib/search'

export const entityRowFields = {
  id: entities.id,
  name: entities.name,
  url: entities.url,
  type: entities.type,
  description: entities.description,
  currentTitle: people.currentTitle,
  currentCompanyName: people.currentCompanyName,
  personLocation: people.location,
  headcount: companies.headcount,
  latestRoundName: companies.latestRoundName,
  hqCity: companies.hqCity,
  hqCountry: companies.hqCountry,
  highlight: sql<string | null>`(
    select ${webPages.highlights} ->> 0
    from entity_pages ep
    join ${webPages} on ${webPages.id} = ep.page_id
    where ep.entity_id = ${entities.id}
    order by ${webPages.fetchedAt} desc
    limit 1
  )`,
}

export interface EntityRow {
  id: string
  name: string
  url: string | null
  type: string
  description: string | null
  currentTitle: string | null
  currentCompanyName: string | null
  personLocation: string | null
  headcount: number | null
  latestRoundName: string | null
  hqCity: string | null
  hqCountry: string | null
  highlight: string | null
}

function joinParts(parts: Array<string | null>, separator: string) {
  const present = parts.filter((part) => part !== null && part !== '')
  return present.length > 0 ? present.join(separator) : null
}

function roleFor(row: EntityRow): string | null {
  if (row.type === 'person') {
    return row.currentTitle && row.currentCompanyName
      ? `${row.currentTitle} at ${row.currentCompanyName}`
      : (row.currentTitle ?? row.currentCompanyName)
  }
  if (row.type === 'company') {
    return joinParts(
      [
        row.headcount === null ? null : `${row.headcount} employees`,
        row.latestRoundName,
      ],
      ' · ',
    )
  }
  return null
}

export function toSearchEntity(
  row: EntityRow,
  source: SearchSource,
): SearchEntity {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    type: row.type,
    role: roleFor(row),
    location:
      row.personLocation ?? joinParts([row.hqCity, row.hqCountry], ', '),
    highlight:
      row.highlight ?? (row.type === 'person' ? null : row.description),
    source,
  }
}
