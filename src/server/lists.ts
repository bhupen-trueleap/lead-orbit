import { and, desc, eq, ne, sql } from 'drizzle-orm'

import { db } from '@/db'
import { lists } from '@/db/schema'
import type { List, ListScope } from '@/lib/lists'
import type { Viewer } from '@/lib/viewer'

const listFields = {
  id: lists.id,
  name: lists.name,
  ownerEmail: lists.ownerEmail,
  createdAt: lists.createdAt,
  updatedAt: lists.updatedAt,
  rowCount: lists.rowCount,
}

interface ListRecord {
  id: string
  name: string
  ownerEmail: string
  createdAt: Date
  updatedAt: Date
  rowCount: number
}

function toList(row: ListRecord, viewer: Viewer): List {
  return {
    id: row.id,
    name: row.name,
    ownerEmail: row.ownerEmail,
    isOwner: row.ownerEmail === viewer.email,
    rowCount: row.rowCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function isNameTaken(
  ownerEmail: string,
  name: string,
  exceptId?: string,
): Promise<boolean> {
  const taken = await db
    .select({ id: lists.id })
    .from(lists)
    .where(
      and(
        eq(lists.ownerEmail, ownerEmail),
        sql`lower(${lists.name}) = lower(${name})`,
        exceptId ? ne(lists.id, exceptId) : undefined,
      ),
    )
    .limit(1)
  return taken.length > 0
}

export async function listLists(
  viewer: Viewer,
  scope: ListScope,
): Promise<Array<List>> {
  const showAll = scope === 'all' && viewer.role === 'admin'
  const rows = await db
    .select(listFields)
    .from(lists)
    .where(showAll ? undefined : eq(lists.ownerEmail, viewer.email))
    .orderBy(desc(lists.updatedAt), desc(lists.id))
  return rows.map((row) => toList(row, viewer))
}

export async function getList(
  id: string,
  viewer: Viewer,
): Promise<List | null> {
  const row = (
    await db.select(listFields).from(lists).where(eq(lists.id, id))
  ).at(0)
  if (!row) return null
  if (row.ownerEmail !== viewer.email && viewer.role !== 'admin') return null
  return toList(row, viewer)
}

export async function createList(
  viewer: Viewer,
  name: string,
): Promise<List | null> {
  if (await isNameTaken(viewer.email, name)) return null
  const row = (
    await db
      .insert(lists)
      .values({ ownerEmail: viewer.email, name })
      .onConflictDoNothing()
      .returning()
  ).at(0)
  return row ? toList(row, viewer) : null
}

export async function renameList(
  viewer: Viewer,
  id: string,
  name: string,
): Promise<List | 'duplicate' | null> {
  if (await isNameTaken(viewer.email, name, id)) return 'duplicate'
  const row = (
    await db
      .update(lists)
      .set({ name, updatedAt: sql`now()` })
      .where(and(eq(lists.id, id), eq(lists.ownerEmail, viewer.email)))
      .returning({ id: lists.id })
  ).at(0)
  return row ? getList(row.id, viewer) : null
}

export async function deleteList(viewer: Viewer, id: string): Promise<void> {
  await db
    .delete(lists)
    .where(and(eq(lists.id, id), eq(lists.ownerEmail, viewer.email)))
}

export async function getWorkbook(
  id: string,
  viewer: Viewer,
): Promise<{
  workbook: Record<string, unknown> | null
  canEdit: boolean
} | null> {
  const row = (
    await db
      .select({ ownerEmail: lists.ownerEmail, workbook: lists.workbook })
      .from(lists)
      .where(eq(lists.id, id))
  ).at(0)
  if (!row) return null
  const isOwner = row.ownerEmail === viewer.email
  if (!isOwner && viewer.role !== 'admin') return null
  return { workbook: row.workbook, canEdit: isOwner }
}

export async function saveWorkbook(
  viewer: Viewer,
  id: string,
  workbook: Record<string, unknown>,
  rowCount: number,
): Promise<boolean> {
  const saved = await db
    .update(lists)
    .set({ workbook, rowCount, updatedAt: sql`now()` })
    .where(and(eq(lists.id, id), eq(lists.ownerEmail, viewer.email)))
    .returning({ id: lists.id })
  return saved.length > 0
}
