import { and, count, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { entities, entityAttributes } from '@/db/schema'
import type { EntitiesPage, PageSize } from '@/lib/entities'

export async function listEntities(
  page: number,
  pageSize: PageSize,
): Promise<EntitiesPage> {
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: entities.id,
        name: entities.name,
        url: entities.url,
        type: entities.type,
        highlight: entityAttributes.value,
      })
      .from(entities)
      .leftJoin(
        entityAttributes,
        and(
          eq(entityAttributes.entityId, entities.id),
          eq(entityAttributes.key, 'highlight'),
        ),
      )
      .orderBy(desc(entities.updatedAt), desc(entities.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(entities),
  ])

  return {
    entities: rows.map((row) => ({ ...row, source: 'database' })),
    total: totals.at(0)?.total ?? 0,
  }
}
