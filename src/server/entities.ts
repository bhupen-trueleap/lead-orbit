import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  isNull,
  lt,
  lte,
  not,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/db'
import { companies, entities, fieldValues, people } from '@/db/schema'
import type { ColumnFilters, EntitiesPage, EntityFilters } from '@/lib/entities'
import type { ColumnDef } from '@/lib/columns'
import { listColumns, loadFieldValues } from '@/server/columns'
import { entityRowFields, toSearchEntity } from '@/server/entity-rows'
import { escapeLike } from '@/server/sql'
import type { ResultCount } from '@/lib/pagination'

export const LINKEDIN_URL = '%linkedin.com/%'

export function startOfDay(date: string, offsetDays = 0): Date {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + offsetDays)
  return value
}

function columnCondition(
  column: ColumnDef,
  filter: NonNullable<ColumnFilters[string]>,
): SQL | undefined {
  const checks: Array<SQL | undefined> = []
  if (column.type === 'text' && filter.contains !== undefined) {
    checks.push(
      ilike(fieldValues.valueText, `%${escapeLike(filter.contains)}%`),
    )
  }
  if (column.type === 'number') {
    if (filter.from !== undefined) {
      checks.push(gte(fieldValues.valueNumber, filter.from))
    }
    if (filter.to !== undefined) {
      checks.push(lte(fieldValues.valueNumber, filter.to))
    }
  }
  if (checks.length === 0) return undefined
  return exists(
    db
      .select({ one: sql`1` })
      .from(fieldValues)
      .where(
        and(
          eq(fieldValues.entityId, entities.id),
          eq(fieldValues.columnId, column.id),
          isNull(fieldValues.searchId),
          ...checks,
        ),
      ),
  )
}

export function buildEntityWhere(
  { q, type, site, addedFrom, addedTo, cols }: EntityFilters,
  filterColumns: Array<ColumnDef>,
): SQL | undefined {
  const conditions: Array<SQL | undefined> = []

  for (const column of filterColumns) {
    const filter = cols?.[column.key]
    if (filter) conditions.push(columnCondition(column, filter))
  }

  if (q) {
    const pattern = `%${escapeLike(q)}%`
    conditions.push(
      or(
        ilike(entities.name, pattern),
        ilike(entities.url, pattern),
        ilike(entities.description, pattern),
        ilike(people.currentTitle, pattern),
        ilike(people.currentCompanyName, pattern),
        ilike(people.location, pattern),
        ilike(companies.hqCity, pattern),
        ilike(companies.hqCountry, pattern),
        exists(
          db
            .select({ one: sql`1` })
            .from(fieldValues)
            .where(
              and(
                eq(fieldValues.entityId, entities.id),
                isNull(fieldValues.searchId),
                ilike(fieldValues.valueText, pattern),
              ),
            ),
        ),
      ),
    )
  }
  if (type) conditions.push(eq(entities.type, type))
  if (site === 'linkedin') conditions.push(ilike(entities.url, LINKEDIN_URL))
  if (site === 'other') {
    conditions.push(
      or(sql`${entities.url} is null`, not(ilike(entities.url, LINKEDIN_URL))),
    )
  }

  if (addedFrom) conditions.push(gte(entities.createdAt, startOfDay(addedFrom)))
  if (addedTo) conditions.push(lt(entities.createdAt, startOfDay(addedTo, 1)))

  return and(...conditions)
}

export async function listEntities(
  page: number,
  pageSize: ResultCount,
  filters: EntityFilters,
): Promise<EntitiesPage> {
  const entityColumns = (await listColumns()).filter(
    (column) => column.scope === 'entity' && column.type !== 'boolean',
  )
  const filterColumns = entityColumns.filter(
    (column) => filters.cols?.[column.key] !== undefined,
  )
  const where = buildEntityWhere(filters, filterColumns)
  const orderBy =
    filters.sort === 'name'
      ? [asc(sql`lower(${entities.name})`), asc(entities.id)]
      : [desc(entities.updatedAt), desc(entities.id)]

  const [rows, totals, types] = await Promise.all([
    db
      .select(entityRowFields)
      .from(entities)
      .leftJoin(people, eq(people.entityId, entities.id))
      .leftJoin(companies, eq(companies.entityId, entities.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(entities)
      .leftJoin(people, eq(people.entityId, entities.id))
      .leftJoin(companies, eq(companies.entityId, entities.id))
      .where(where),
    db
      .select({ type: entities.type, count: count() })
      .from(entities)
      .groupBy(entities.type)
      .orderBy(desc(count())),
  ])

  const values = await loadFieldValues(
    entityColumns,
    { entityIds: rows.map((row) => row.id), pageIds: [] },
    null,
  )

  return {
    entities: rows.map((row) => ({
      ...toSearchEntity(row),
      values: values.get(row.id)?.values ?? {},
      evidence: values.get(row.id)?.evidence ?? {},
    })),
    total: totals.at(0)?.total ?? 0,
    types,
  }
}
