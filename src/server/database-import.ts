import { inArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import { companies, entities, fieldValues, people } from '@/db/schema'
import type { ColumnDef, FieldValue } from '@/lib/columns'
import { normalizeImportUrl } from '@/lib/database-import'
import type {
  EntityKind,
  ImportCounts,
  ImportRow,
  TypeChoice,
} from '@/lib/database-import'
import { coerceValue, listColumns, typedFields } from '@/server/columns'

const IMPORTED = 'imported'
const VALUE_CHUNK = 1000

const personFields = {
  current_title: 'currentTitle',
  company: 'currentCompanyName',
  location: 'location',
} satisfies Record<string, keyof typeof people.$inferInsert>

const companyFields = {
  headcount: 'headcount',
  total_funding: 'fundingTotal',
} satisfies Record<string, keyof typeof companies.$inferInsert>

function detectKind(url: string): EntityKind {
  return /linkedin\.com\/in\//.test(url) ? 'person' : 'company'
}

function kindFor(row: ImportRow, url: string, choice: TypeChoice): EntityKind {
  if (row.type) return row.type
  return choice === 'detect' ? detectKind(url) : choice
}

function textOf(value: FieldValue | undefined): string | null {
  if (value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function numberOf(value: FieldValue | undefined): number | null {
  if (typeof value === 'number') return Math.round(value)
  if (typeof value !== 'string') return null
  const number = Number(value.replace(/[,\s]/g, ''))
  return Number.isFinite(number) ? Math.round(number) : null
}

export async function importRows(
  input: Array<ImportRow>,
  choice: TypeChoice,
): Promise<ImportCounts> {
  const columns = new Map(
    (await listColumns())
      .filter((column) => column.scope === 'entity')
      .map((column) => [column.id, column]),
  )

  const rows = new Map<string, ImportRow>()
  for (const row of input) {
    const url = normalizeImportUrl(row.url)
    const name = row.name.trim()
    if (url && name && !rows.has(url)) rows.set(url, { ...row, url, name })
  }
  if (rows.size === 0) return { created: 0, filled: 0, unchanged: 0 }

  const urls = [...rows.keys()]
  const existing = await db
    .select({ id: entities.id, url: entities.url, type: entities.type })
    .from(entities)
    .where(inArray(entities.url, urls))
  const idByUrl = new Map<
    string,
    { id: string; type: string; isNew: boolean }
  >()
  for (const entity of existing) {
    if (entity.url) {
      idByUrl.set(entity.url, {
        id: entity.id,
        type: entity.type,
        isNew: false,
      })
    }
  }

  const toCreate = urls.filter((url) => !idByUrl.has(url))
  if (toCreate.length > 0) {
    const created = await db
      .insert(entities)
      .values(
        toCreate.map((url) => {
          const row = rows.get(url)
          return {
            type: row ? kindFor(row, url, choice) : detectKind(url),
            name: row?.name ?? url,
            url,
          }
        }),
      )
      .onConflictDoNothing()
      .returning({ id: entities.id, url: entities.url, type: entities.type })
    for (const entity of created) {
      if (entity.url) {
        idByUrl.set(entity.url, {
          id: entity.id,
          type: entity.type,
          isNew: true,
        })
      }
    }
  }

  const ids = [...idByUrl.values()].map((entity) => entity.id)
  const [peopleRows, companyRows] = await Promise.all([
    db.select().from(people).where(inArray(people.entityId, ids)),
    db.select().from(companies).where(inArray(companies.entityId, ids)),
  ])
  const peopleById = new Map(peopleRows.map((row) => [row.entityId, row]))
  const companiesById = new Map(companyRows.map((row) => [row.entityId, row]))

  const filledIds = new Set<string>()
  const personUpserts: Array<typeof people.$inferInsert> = []
  const companyUpserts: Array<typeof companies.$inferInsert> = []
  const valueRows: Array<typeof fieldValues.$inferInsert> = []

  for (const [url, row] of rows) {
    const entity = idByUrl.get(url)
    if (!entity) continue
    const byKey = new Map<string, FieldValue>()
    for (const [columnId, raw] of Object.entries(row.values)) {
      const column: ColumnDef | undefined = columns.get(columnId)
      if (!column) continue
      byKey.set(column.key, raw)
      const value = coerceValue(column, raw)
      if (value === null) continue
      valueRows.push({
        columnId,
        entityId: entity.id,
        confidence: IMPORTED,
        ...typedFields(column, value),
      })
    }

    if (entity.type === 'person') {
      const current = peopleById.get(entity.id)
      const next: typeof people.$inferInsert = { entityId: entity.id }
      let changed = false
      for (const [key, field] of Object.entries(personFields)) {
        const value = textOf(byKey.get(key))
        if (value !== null && (current?.[field] ?? null) === null) {
          next[field] = value
          changed = true
        }
      }
      if (changed || !current) personUpserts.push(next)
      if (changed && !entity.isNew) filledIds.add(entity.id)
    } else if (entity.type === 'company') {
      const current = companiesById.get(entity.id)
      const next: typeof companies.$inferInsert = { entityId: entity.id }
      let changed = false
      for (const [key, field] of Object.entries(companyFields)) {
        const value = numberOf(byKey.get(key))
        if (value !== null && (current?.[field] ?? null) === null) {
          next[field] = value
          changed = true
        }
      }
      if (changed || !current) companyUpserts.push(next)
      if (changed && !entity.isNew) filledIds.add(entity.id)
    }
  }

  if (personUpserts.length > 0) {
    await db
      .insert(people)
      .values(personUpserts)
      .onConflictDoUpdate({
        target: people.entityId,
        set: {
          currentTitle: sql`coalesce(${people.currentTitle}, excluded.current_title)`,
          currentCompanyName: sql`coalesce(${people.currentCompanyName}, excluded.current_company_name)`,
          location: sql`coalesce(${people.location}, excluded.location)`,
        },
      })
  }
  if (companyUpserts.length > 0) {
    await db
      .insert(companies)
      .values(companyUpserts)
      .onConflictDoUpdate({
        target: companies.entityId,
        set: {
          headcount: sql`coalesce(${companies.headcount}, excluded.headcount)`,
          fundingTotal: sql`coalesce(${companies.fundingTotal}, excluded.funding_total)`,
        },
      })
  }

  for (let start = 0; start < valueRows.length; start += VALUE_CHUNK) {
    const inserted = await db
      .insert(fieldValues)
      .values(valueRows.slice(start, start + VALUE_CHUNK))
      .onConflictDoNothing()
      .returning({ entityId: fieldValues.entityId })
    for (const { entityId } of inserted) {
      if (entityId) filledIds.add(entityId)
    }
  }

  let created = 0
  let filled = 0
  let unchanged = 0
  for (const entity of idByUrl.values()) {
    if (entity.isNew) created += 1
    else if (filledIds.has(entity.id)) filled += 1
    else unchanged += 1
  }
  return { created, filled, unchanged }
}
