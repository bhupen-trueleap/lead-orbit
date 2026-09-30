import {
  and,
  arrayContains,
  asc,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm'

import { db } from '@/db'
import {
  columns,
  fieldValues,
  savedSearchColumns,
  searchColumns,
} from '@/db/schema'
import {
  columnKeyFromLabel,
  defaultGroupFor,
  isDefaultGroup,
  isColumnScope,
  isColumnType,
  isFieldValue,
} from '@/lib/columns'
import type {
  ColumnDef,
  ColumnDraft,
  FieldValue,
  FieldValues,
} from '@/lib/columns'
import { isSearchCategory } from '@/lib/search'
import type { FieldEvidenceMap } from '@/lib/agent'
import type { SearchCategory } from '@/lib/search'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

const NUMBER_TEXT = /^-?[\d,]*\.?\d+\s*[kmb]?$/i
const FOLLOWERS_TEXT = /([\d][\d,.]*\s*[kmb]?)\s+followers/i

const textFallbacks: Partial<Record<string, (text: string) => unknown>> = {
  linkedin_followers: (text) => FOLLOWERS_TEXT.exec(text)?.[1],
}

function toColumnDef(row: typeof columns.$inferSelect): ColumnDef | null {
  if (!isColumnType(row.type) || !isColumnScope(row.scope)) return null
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    type: row.type,
    instruction: row.instruction,
    category: isSearchCategory(row.category) ? row.category : null,
    scope: row.scope,
    isPreset: row.isPreset,
    defaultIn: row.defaultIn.filter(isDefaultGroup),
    sortOrder: row.sortOrder,
  }
}

function toColumnDefs(
  rows: Array<typeof columns.$inferSelect>,
): Array<ColumnDef> {
  return rows.flatMap((row) => {
    const column = toColumnDef(row)
    return column ? [column] : []
  })
}

export async function listColumns(): Promise<Array<ColumnDef>> {
  const rows = await db
    .select()
    .from(columns)
    .where(isNull(columns.archivedAt))
    .orderBy(asc(columns.sortOrder), asc(columns.label))
  return toColumnDefs(rows)
}

export async function createColumn(
  draft: ColumnDraft,
  email: string,
): Promise<ColumnDef | null> {
  const key = columnKeyFromLabel(draft.label)
  const inserted = await db
    .insert(columns)
    .values({ key, ...draft, createdByEmail: email })
    .onConflictDoNothing({ target: columns.key })
    .returning()
  const row =
    inserted.at(0) ??
    (await db.select().from(columns).where(eq(columns.key, key))).at(0)
  return row ? toColumnDef(row) : null
}

export async function resolveColumns(
  ids: Array<string>,
  category: SearchCategory | undefined,
): Promise<Array<ColumnDef>> {
  if (ids.length === 0) {
    const presets = await db
      .select()
      .from(columns)
      .where(
        and(
          isNull(columns.archivedAt),
          arrayContains(columns.defaultIn, [defaultGroupFor(category)]),
        ),
      )
      .orderBy(asc(columns.sortOrder), asc(columns.label))
    return toColumnDefs(presets)
  }
  const rows = await db.select().from(columns).where(inArray(columns.id, ids))
  const byId = new Map(toColumnDefs(rows).map((column) => [column.id, column]))
  return ids.flatMap((id) => {
    const column = byId.get(id)
    return column ? [column] : []
  })
}

export function buildSummarySchema(list: Array<ColumnDef>) {
  return {
    query:
      'Extract these fields from this page about the person, company, or topic it describes. Fill every field the page states, including numbers such as follower counts. Use null only when the page does not mention the value at all.',
    schema: {
      type: 'object',
      properties: Object.fromEntries(
        list.map((column) => [
          column.key,
          {
            type: column.type === 'text' ? 'string' : column.type,
            description: column.instruction,
          },
        ]),
      ),
    },
  }
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !NUMBER_TEXT.test(value.trim())) return null
  const text = value.trim().toLowerCase().replace(/,/g, '')
  const multiplier = text.endsWith('k')
    ? 1_000
    : text.endsWith('m')
      ? 1_000_000
      : text.endsWith('b')
        ? 1_000_000_000
        : 1
  const number = Number.parseFloat(text) * multiplier
  return Number.isFinite(number) ? number : null
}

export function coerceValue(
  column: ColumnDef,
  value: unknown,
): FieldValue | null {
  if (value === null || value === undefined) return null
  if (column.type === 'number') return coerceNumber(value)
  if (column.type === 'boolean') {
    if (typeof value === 'boolean') return value
    if (value === 'true' || value === 'yes') return true
    if (value === 'false' || value === 'no') return false
    return null
  }
  if (typeof value === 'string') {
    const text = value.trim()
    return text === '' ? null : text.slice(0, 2000)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

function typedFields(column: ColumnDef, value: FieldValue) {
  return {
    valueText:
      column.type === 'text' && typeof value === 'string' ? value : null,
    valueNumber:
      column.type === 'number' && typeof value === 'number' ? value : null,
    valueBoolean:
      column.type === 'boolean' && typeof value === 'boolean' ? value : null,
  }
}

interface StoreTarget {
  entityId: string | null
  pageId: string | null
  searchId: string
  pageText: string | null
  evidence?: FieldEvidenceMap
}

function valueFor(
  column: ColumnDef,
  extracted: Record<string, unknown>,
  pageText: string | null,
): FieldValue | null {
  const value = coerceValue(column, extracted[column.key])
  if (value !== null || !pageText) return value
  const fallback = textFallbacks[column.key]
  return fallback ? coerceValue(column, fallback(pageText)) : null
}

export async function storeFieldValues(
  tx: Transaction,
  list: Array<ColumnDef>,
  extracted: Record<string, unknown>,
  target: StoreTarget,
): Promise<FieldValues> {
  const stored: FieldValues = {}
  for (const column of list) {
    const value = valueFor(column, extracted, target.pageText)
    if (value === null) continue
    const targetEntityId = target.entityId
    const targetPageId = targetEntityId ? null : target.pageId
    if (!targetEntityId && !targetPageId) continue
    stored[column.key] = value
    const evidence = target.evidence?.[column.key]
    await tx
      .insert(fieldValues)
      .values({
        columnId: column.id,
        entityId: targetEntityId,
        pageId: targetPageId,
        searchId: column.scope === 'search' ? target.searchId : null,
        sourcePageId: target.pageId,
        citations: evidence?.citations ?? null,
        confidence: evidence?.confidence ?? null,
        ...typedFields(column, value),
      })
      .onConflictDoUpdate({
        target: [
          fieldValues.columnId,
          fieldValues.entityId,
          fieldValues.pageId,
          fieldValues.searchId,
        ],
        set: {
          ...typedFields(column, value),
          sourcePageId: target.pageId,
          citations: evidence?.citations ?? null,
          confidence: evidence?.confidence ?? null,
          extractedAt: sql`now()`,
        },
      })
  }
  return stored
}

function readValue(row: {
  valueText: string | null
  valueNumber: number | null
  valueBoolean: boolean | null
}): FieldValue | null {
  const value = row.valueText ?? row.valueNumber ?? row.valueBoolean
  return isFieldValue(value) ? value : null
}

export interface StoredFields {
  values: FieldValues
  evidence: FieldEvidenceMap
}

export async function loadFieldValues(
  list: Array<ColumnDef>,
  targets: { entityIds: Array<string>; pageIds: Array<string> },
  searchId: string | null,
): Promise<Map<string, StoredFields>> {
  const result = new Map<string, StoredFields>()
  if (
    list.length === 0 ||
    (targets.entityIds.length === 0 && targets.pageIds.length === 0)
  ) {
    return result
  }
  const byId = new Map(list.map((column) => [column.id, column]))
  const rows = await db
    .select({
      columnId: fieldValues.columnId,
      entityId: fieldValues.entityId,
      pageId: fieldValues.pageId,
      searchId: fieldValues.searchId,
      valueText: fieldValues.valueText,
      valueNumber: fieldValues.valueNumber,
      valueBoolean: fieldValues.valueBoolean,
      citations: fieldValues.citations,
      confidence: fieldValues.confidence,
    })
    .from(fieldValues)
    .where(
      and(
        inArray(fieldValues.columnId, [...byId.keys()]),
        or(
          targets.entityIds.length > 0
            ? inArray(fieldValues.entityId, targets.entityIds)
            : undefined,
          targets.pageIds.length > 0
            ? inArray(fieldValues.pageId, targets.pageIds)
            : undefined,
        ),
        searchId
          ? or(isNull(fieldValues.searchId), eq(fieldValues.searchId, searchId))
          : isNull(fieldValues.searchId),
      ),
    )

  for (const row of rows) {
    const column = byId.get(row.columnId)
    const targetId = row.entityId ?? row.pageId
    const value = readValue(row)
    if (!column || !targetId || value === null) continue
    if (column.scope === 'search' && row.searchId !== searchId) continue
    const stored = result.get(targetId) ?? { values: {}, evidence: {} }
    stored.values[column.key] = value
    if (row.citations) {
      stored.evidence[column.key] = {
        confidence: row.confidence,
        citations: row.citations,
      }
    }
    result.set(targetId, stored)
  }
  return result
}

function groupIds(
  rows: Array<{ parentId: string; columnId: string }>,
): Map<string, Array<string>> {
  const grouped = new Map<string, Array<string>>()
  for (const { parentId, columnId } of rows) {
    grouped.set(parentId, [...(grouped.get(parentId) ?? []), columnId])
  }
  return grouped
}

export async function loadSearchColumnIds(
  searchIds: Array<string>,
): Promise<Map<string, Array<string>>> {
  if (searchIds.length === 0) return new Map()
  const rows = await db
    .select({
      parentId: searchColumns.searchId,
      columnId: searchColumns.columnId,
    })
    .from(searchColumns)
    .where(inArray(searchColumns.searchId, searchIds))
    .orderBy(asc(searchColumns.position))
  return groupIds(rows)
}

export async function loadSavedSearchColumnIds(
  savedSearchIds: Array<string>,
): Promise<Map<string, Array<string>>> {
  if (savedSearchIds.length === 0) return new Map()
  const rows = await db
    .select({
      parentId: savedSearchColumns.savedSearchId,
      columnId: savedSearchColumns.columnId,
    })
    .from(savedSearchColumns)
    .where(inArray(savedSearchColumns.savedSearchId, savedSearchIds))
    .orderBy(asc(savedSearchColumns.position))
  return groupIds(rows)
}

export async function replaceSavedSearchColumns(
  savedSearchId: string,
  ids: Array<string>,
): Promise<void> {
  const known = await resolveColumns(ids, undefined)
  await db.transaction(async (tx) => {
    await tx
      .delete(savedSearchColumns)
      .where(eq(savedSearchColumns.savedSearchId, savedSearchId))
    if (ids.length > 0 && known.length > 0) {
      await tx.insert(savedSearchColumns).values(
        known.map((column, index) => ({
          savedSearchId,
          columnId: column.id,
          position: index,
        })),
      )
    }
  })
}
