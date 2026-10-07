import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  ne,
  not,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/db'
import {
  collectionItems,
  collections,
  companies,
  entities,
  people,
  webPages,
} from '@/db/schema'
import type {
  AddItemsResult,
  Collection,
  CollectionPage,
} from '@/lib/collections'
import type { ResultCount } from '@/lib/pagination'
import { listColumns, loadFieldValues } from '@/server/columns'
import type { EntityFilters } from '@/lib/entities'
import { LINKEDIN_URL, buildEntityWhere, startOfDay } from '@/server/entities'
import { entityRowFields, pageRow, toSearchEntity } from '@/server/entity-rows'
import { escapeLike } from '@/server/sql'

const PAGE_TYPE = 'page'

const collectionFields = {
  id: collections.id,
  name: collections.name,
  updatedAt: collections.updatedAt,
  itemCount: count(collectionItems.id),
}

function toCollection(row: {
  id: string
  name: string
  updatedAt: Date
  itemCount: number
}): Collection {
  return { ...row, updatedAt: row.updatedAt.toISOString() }
}

export async function listCollections(): Promise<Array<Collection>> {
  const rows = await db
    .select(collectionFields)
    .from(collections)
    .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
    .groupBy(collections.id)
    .orderBy(desc(collections.updatedAt), desc(collections.id))
  return rows.map(toCollection)
}

async function loadCollection(id: string): Promise<Collection | null> {
  const row = (
    await db
      .select(collectionFields)
      .from(collections)
      .leftJoin(
        collectionItems,
        eq(collectionItems.collectionId, collections.id),
      )
      .where(eq(collections.id, id))
      .groupBy(collections.id)
  ).at(0)
  return row ? toCollection(row) : null
}

async function isNameTaken(name: string, exceptId?: string): Promise<boolean> {
  const taken = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        sql`lower(${collections.name}) = lower(${name})`,
        exceptId ? ne(collections.id, exceptId) : undefined,
      ),
    )
    .limit(1)
  return taken.length > 0
}

export async function createCollection(
  name: string,
): Promise<Collection | null> {
  if (await isNameTaken(name)) return null
  const row = (
    await db
      .insert(collections)
      .values({ name })
      .onConflictDoNothing({ target: collections.name })
      .returning({
        id: collections.id,
        name: collections.name,
        updatedAt: collections.updatedAt,
      })
  ).at(0)
  return row ? toCollection({ ...row, itemCount: 0 }) : null
}

export async function renameCollection(
  id: string,
  name: string,
): Promise<Collection | 'duplicate' | null> {
  if (await isNameTaken(name, id)) return 'duplicate'
  await db
    .update(collections)
    .set({ name, updatedAt: sql`now()` })
    .where(eq(collections.id, id))
  return loadCollection(id)
}

export async function deleteCollection(id: string): Promise<void> {
  await db.delete(collections).where(eq(collections.id, id))
}

export async function addCollectionItems(
  collectionId: string,
  ids: Array<string>,
): Promise<AddItemsResult | null> {
  const [found, entityRows, pageRows] = await Promise.all([
    db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.id, collectionId)),
    db
      .select({ id: entities.id })
      .from(entities)
      .where(inArray(entities.id, ids)),
    db
      .select({ id: webPages.id })
      .from(webPages)
      .where(inArray(webPages.id, ids)),
  ])
  if (found.length === 0) return null

  const items = [
    ...entityRows.map(({ id }) => ({
      collectionId,
      entityId: id,
      pageId: null,
    })),
    ...pageRows.map(({ id }) => ({ collectionId, entityId: null, pageId: id })),
  ]
  if (items.length === 0) return { added: 0, alreadyIn: 0 }

  const inserted = await db
    .insert(collectionItems)
    .values(items)
    .onConflictDoNothing()
    .returning({ id: collectionItems.id })
  if (inserted.length > 0) {
    await db
      .update(collections)
      .set({ updatedAt: sql`now()` })
      .where(eq(collections.id, collectionId))
  }
  return { added: inserted.length, alreadyIn: items.length - inserted.length }
}

export async function removeCollectionItems(
  collectionId: string,
  ids: Array<string>,
): Promise<void> {
  const removed = await db
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collectionId),
        or(
          inArray(collectionItems.entityId, ids),
          inArray(collectionItems.pageId, ids),
        ),
      ),
    )
    .returning({ id: collectionItems.id })
  if (removed.length > 0) {
    await db
      .update(collections)
      .set({ updatedAt: sql`now()` })
      .where(eq(collections.id, collectionId))
  }
}

function pageWhere({
  q,
  site,
  addedFrom,
  addedTo,
}: EntityFilters): SQL | undefined {
  const pattern = q ? `%${escapeLike(q)}%` : null
  return and(
    pattern
      ? or(
          ilike(webPages.title, pattern),
          ilike(webPages.url, pattern),
          ilike(webPages.author, pattern),
        )
      : undefined,
    site === 'linkedin' ? ilike(webPages.url, LINKEDIN_URL) : undefined,
    site === 'other' ? not(ilike(webPages.url, LINKEDIN_URL)) : undefined,
    addedFrom ? gte(webPages.createdAt, startOfDay(addedFrom)) : undefined,
    addedTo ? lt(webPages.createdAt, startOfDay(addedTo, 1)) : undefined,
  )
}

export async function getCollectionPage(
  collectionId: string,
  page: number,
  pageSize: ResultCount,
  filters: EntityFilters,
): Promise<CollectionPage | null> {
  const [collection, allColumns] = await Promise.all([
    loadCollection(collectionId),
    listColumns(),
  ])
  if (!collection) return null

  const entityColumns = allColumns.filter(
    (column) => column.scope === 'entity' && column.type !== 'boolean',
  )
  const filterColumns = entityColumns.filter(
    (column) => filters.cols?.[column.key] !== undefined,
  )
  const inCollection = eq(collectionItems.collectionId, collectionId)
  const entityWhere = and(
    inCollection,
    buildEntityWhere(filters, filterColumns),
  )
  const pagesWhere = and(inCollection, pageWhere(filters))
  const showEntities = filters.type !== PAGE_TYPE
  const showPages =
    (filters.type === undefined || filters.type === PAGE_TYPE) &&
    filterColumns.length === 0
  const added = [desc(collectionItems.addedAt), desc(collectionItems.id)]
  const offset = (page - 1) * pageSize

  const [entityRows, entityTotals, pageTotals, entityTypes, pageCounts] =
    await Promise.all([
      showEntities
        ? db
            .select(entityRowFields)
            .from(collectionItems)
            .innerJoin(entities, eq(entities.id, collectionItems.entityId))
            .leftJoin(people, eq(people.entityId, entities.id))
            .leftJoin(companies, eq(companies.entityId, entities.id))
            .where(entityWhere)
            .orderBy(
              ...(filters.sort === 'name'
                ? [asc(sql`lower(${entities.name})`), asc(entities.id)]
                : added),
            )
            .limit(pageSize)
            .offset(offset)
        : [],
      showEntities
        ? db
            .select({ total: count() })
            .from(collectionItems)
            .innerJoin(entities, eq(entities.id, collectionItems.entityId))
            .leftJoin(people, eq(people.entityId, entities.id))
            .leftJoin(companies, eq(companies.entityId, entities.id))
            .where(entityWhere)
        : [],
      showPages
        ? db
            .select({ total: count() })
            .from(collectionItems)
            .innerJoin(webPages, eq(webPages.id, collectionItems.pageId))
            .where(pagesWhere)
        : [],
      db
        .select({ type: entities.type, count: count() })
        .from(collectionItems)
        .innerJoin(entities, eq(entities.id, collectionItems.entityId))
        .where(inCollection)
        .groupBy(entities.type)
        .orderBy(desc(count())),
      db
        .select({ count: count(collectionItems.pageId) })
        .from(collectionItems)
        .where(inCollection),
    ])

  const entityTotal = entityTotals.at(0)?.total ?? 0
  const pageTotal = pageTotals.at(0)?.total ?? 0
  const room = pageSize - entityRows.length
  const pages =
    showPages && room > 0 && pageTotal > 0
      ? await db
          .select({ page: webPages })
          .from(collectionItems)
          .innerJoin(webPages, eq(webPages.id, collectionItems.pageId))
          .where(pagesWhere)
          .orderBy(
            ...(filters.sort === 'name'
              ? [
                  asc(sql`lower(coalesce(${webPages.title}, ${webPages.url}))`),
                  asc(webPages.id),
                ]
              : added),
          )
          .limit(room)
          .offset(Math.max(0, offset - entityTotal))
      : []

  const rows = [
    ...entityRows.map(toSearchEntity),
    ...pages.map((row) => pageRow(row.page)),
  ]
  const values = await loadFieldValues(
    entityColumns,
    {
      entityIds: entityRows.map((row) => row.id),
      pageIds: pages.map((row) => row.page.id),
    },
    null,
  )
  const storedPages = pageCounts.at(0)?.count ?? 0

  return {
    collection,
    entities: rows.map((row) => ({
      ...row,
      values: values.get(row.id)?.values ?? {},
      evidence: values.get(row.id)?.evidence ?? {},
    })),
    total: entityTotal + pageTotal,
    types: [
      ...entityTypes,
      ...(storedPages > 0 ? [{ type: PAGE_TYPE, count: storedPages }] : []),
    ],
  }
}
