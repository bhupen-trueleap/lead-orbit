import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { companies, entities, people } from '@/db/schema'
import type { ColumnDef } from '@/lib/columns'
import type { SearchEntity } from '@/lib/search'
import { loadFieldValues } from '@/server/columns'
import { entityRowFields, toSearchEntity } from '@/server/entity-rows'
import type { EntityRow } from '@/server/entity-rows'

export interface ResultRow {
  entity: SearchEntity
  entityId: string | null
  pageId: string | null
}

export async function loadEntityRows(
  ids: Array<string>,
): Promise<Map<string, SearchEntity>> {
  if (ids.length === 0) return new Map()
  const rows: Array<EntityRow> = await db
    .select(entityRowFields)
    .from(entities)
    .leftJoin(people, eq(people.entityId, entities.id))
    .leftJoin(companies, eq(companies.entityId, entities.id))
    .where(inArray(entities.id, ids))
  return new Map(rows.map((row) => [row.id, toSearchEntity(row)]))
}

export async function attachValues(
  rows: Array<ResultRow>,
  columnDefs: Array<ColumnDef>,
  searchId: string,
): Promise<Array<ResultRow>> {
  const values = await loadFieldValues(
    columnDefs,
    {
      entityIds: rows.flatMap((row) => (row.entityId ? [row.entityId] : [])),
      pageIds: rows.flatMap((row) =>
        !row.entityId && row.pageId ? [row.pageId] : [],
      ),
    },
    searchId,
  )
  return rows.map((row) => {
    const targetId = row.entityId ?? row.pageId
    const stored = targetId ? values.get(targetId) : undefined
    return stored
      ? {
          ...row,
          entity: {
            ...row.entity,
            values: stored.values,
            evidence: stored.evidence,
          },
        }
      : row
  })
}
