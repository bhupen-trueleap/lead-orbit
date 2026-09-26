import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  not,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/db'
import { entities, entityAttributes } from '@/db/schema'
import type { EntitiesPage, EntityFilters, PageSize } from '@/lib/entities'

const LINKEDIN_URL = '%linkedin.com/%'

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function startOfDay(date: string, offsetDays = 0): Date {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + offsetDays)
  return value
}

function buildWhere({
  q,
  type,
  site,
  addedFrom,
  addedTo,
}: EntityFilters): SQL | undefined {
  const conditions: Array<SQL | undefined> = []

  if (q) {
    const pattern = `%${escapeLike(q)}%`
    conditions.push(
      or(
        ilike(entities.name, pattern),
        ilike(entities.url, pattern),
        ilike(entityAttributes.value, pattern),
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

const highlightJoin = and(
  eq(entityAttributes.entityId, entities.id),
  eq(entityAttributes.key, 'highlight'),
)

export async function listEntities(
  page: number,
  pageSize: PageSize,
  filters: EntityFilters,
): Promise<EntitiesPage> {
  const where = buildWhere(filters)
  const orderBy =
    filters.sort === 'name'
      ? [asc(sql`lower(${entities.name})`), asc(entities.id)]
      : [desc(entities.updatedAt), desc(entities.id)]

  const [rows, totals, types] = await Promise.all([
    db
      .select({
        id: entities.id,
        name: entities.name,
        url: entities.url,
        type: entities.type,
        highlight: entityAttributes.value,
      })
      .from(entities)
      .leftJoin(entityAttributes, highlightJoin)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(entities)
      .leftJoin(entityAttributes, highlightJoin)
      .where(where),
    db
      .select({ type: entities.type, count: count() })
      .from(entities)
      .groupBy(entities.type)
      .orderBy(desc(count())),
  ])

  return {
    entities: rows.map((row) => ({ ...row, source: 'database' })),
    total: totals.at(0)?.total ?? 0,
    types,
  }
}
