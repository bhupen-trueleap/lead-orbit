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
import { companies, entities, people } from '@/db/schema'
import type { EntitiesPage, EntityFilters, PageSize } from '@/lib/entities'
import { entityRowFields, toSearchEntity } from '@/server/entity-rows'

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
        ilike(entities.description, pattern),
        ilike(people.currentTitle, pattern),
        ilike(people.currentCompanyName, pattern),
        ilike(people.location, pattern),
        ilike(companies.hqCity, pattern),
        ilike(companies.hqCountry, pattern),
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

  return {
    entities: rows.map((row) => toSearchEntity(row, 'database')),
    total: totals.at(0)?.total ?? 0,
    types,
  }
}
