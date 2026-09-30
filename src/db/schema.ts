import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const entities = pgTable(
  'entities',
  {
    id: uuid().primaryKey().defaultRandom(),
    type: text().notNull(),
    name: text().notNull(),
    url: text().unique(),
    exaEntityId: text().unique(),
    description: text(),
    properties: jsonb().$type<Record<string, unknown>>(),
    version: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.type), index().on(table.name)],
)

export const webPages = pgTable('web_pages', {
  id: uuid().primaryKey().defaultRandom(),
  url: text().notNull().unique(),
  exaId: text(),
  title: text(),
  author: text(),
  publishedDate: timestamp({ withTimezone: true }),
  image: text(),
  favicon: text(),
  text: text(),
  highlights: jsonb().$type<Array<string>>().notNull().default([]),
  fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const entityPages = pgTable(
  'entity_pages',
  {
    entityId: uuid()
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    pageId: uuid()
      .notNull()
      .references(() => webPages.id, { onDelete: 'cascade' }),
    role: text().notNull().default('describes'),
  },
  (table) => [
    primaryKey({ columns: [table.entityId, table.pageId] }),
    index().on(table.pageId),
  ],
)

export const people = pgTable(
  'people',
  {
    entityId: uuid()
      .primaryKey()
      .references(() => entities.id, { onDelete: 'cascade' }),
    firstName: text(),
    lastName: text(),
    location: text(),
    currentTitle: text(),
    currentCompanyName: text(),
    currentCompanyExaId: text(),
    seniority: text(),
  },
  (table) => [index().on(table.seniority), index().on(table.location)],
)

export const companies = pgTable(
  'companies',
  {
    entityId: uuid()
      .primaryKey()
      .references(() => entities.id, { onDelete: 'cascade' }),
    foundedYear: integer(),
    headcount: integer(),
    hqAddress: text(),
    hqCity: text(),
    hqCountry: text(),
    revenueAnnual: bigint({ mode: 'number' }),
    fundingTotal: bigint({ mode: 'number' }),
    latestRoundName: text(),
    latestRoundDate: date(),
    latestRoundAmount: bigint({ mode: 'number' }),
    monthlyVisits: bigint({ mode: 'number' }),
  },
  (table) => [
    index().on(table.headcount),
    index().on(table.fundingTotal),
    index().on(table.hqCity),
  ],
)

export const positions = pgTable(
  'positions',
  {
    id: uuid().primaryKey().defaultRandom(),
    personId: uuid()
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    companyExaId: text(),
    companyName: text(),
    title: text(),
    location: text(),
    startDate: date(),
    endDate: date(),
    isCurrent: boolean().notNull().default(false),
  },
  (table) => [index().on(table.personId), index().on(table.companyExaId)],
)

export const searches = pgTable(
  'searches',
  {
    id: uuid().primaryKey().defaultRandom(),
    query: text().notNull(),
    category: text(),
    resultLimit: integer(),
    mode: text(),
    createdByEmail: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.createdByEmail, table.createdAt)],
)

export const searchResults = pgTable(
  'search_results',
  {
    id: uuid().primaryKey().defaultRandom(),
    searchId: uuid()
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),
    entityId: uuid().references(() => entities.id, { onDelete: 'cascade' }),
    pageId: uuid().references(() => webPages.id, { onDelete: 'cascade' }),
    rank: integer(),
  },
  (table) => [
    unique().on(table.searchId, table.entityId),
    unique().on(table.searchId, table.pageId),
    index().on(table.entityId),
    index().on(table.pageId),
  ],
)

export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid().primaryKey().defaultRandom(),
    query: text().notNull(),
    category: text(),
    resultLimit: integer().notNull().default(10),
    mode: text(),
    createdByEmail: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.createdByEmail),
    unique()
      .on(table.createdByEmail, table.query, table.category)
      .nullsNotDistinct(),
  ],
)

export const columns = pgTable(
  'columns',
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text().notNull().unique(),
    label: text().notNull(),
    type: text().notNull(),
    instruction: text().notNull(),
    category: text(),
    scope: text().notNull(),
    isPreset: boolean().notNull().default(false),
    defaultIn: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sortOrder: integer().notNull().default(1000),
    archivedAt: timestamp({ withTimezone: true }),
    createdByEmail: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    check('columns_type_check', sql`type in ('text', 'number', 'boolean')`),
    check('columns_scope_check', sql`scope in ('entity', 'search')`),
  ],
)

export const fieldValues = pgTable(
  'field_values',
  {
    id: uuid().primaryKey().defaultRandom(),
    columnId: uuid()
      .notNull()
      .references(() => columns.id, { onDelete: 'cascade' }),
    entityId: uuid().references(() => entities.id, { onDelete: 'cascade' }),
    pageId: uuid().references(() => webPages.id, { onDelete: 'cascade' }),
    searchId: uuid().references(() => searches.id, { onDelete: 'cascade' }),
    valueText: text(),
    valueNumber: doublePrecision(),
    valueBoolean: boolean(),
    sourcePageId: uuid().references(() => webPages.id, {
      onDelete: 'set null',
    }),
    citations: jsonb().$type<Array<{ url: string; title: string | null }>>(),
    confidence: text(),
    extractedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'field_values_target_check',
      sql`num_nonnulls(${table.entityId}, ${table.pageId}) = 1`,
    ),
    check(
      'field_values_value_check',
      sql`num_nonnulls(${table.valueText}, ${table.valueNumber}, ${table.valueBoolean}) = 1`,
    ),
    unique('field_values_slot_unique')
      .on(table.columnId, table.entityId, table.pageId, table.searchId)
      .nullsNotDistinct(),
    index().on(table.columnId, table.valueNumber),
    index().on(table.columnId, table.valueText),
    index().on(table.columnId, table.valueBoolean),
    index().on(table.entityId),
    index().on(table.pageId),
    index().on(table.searchId),
  ],
)

export const searchColumns = pgTable(
  'search_columns',
  {
    searchId: uuid()
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),
    columnId: uuid()
      .notNull()
      .references(() => columns.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.searchId, table.columnId] })],
)

export const savedSearchColumns = pgTable(
  'saved_search_columns',
  {
    savedSearchId: uuid()
      .notNull()
      .references(() => savedSearches.id, { onDelete: 'cascade' }),
    columnId: uuid()
      .notNull()
      .references(() => columns.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.savedSearchId, table.columnId] })],
)

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: uuid().primaryKey().defaultRandom(),
    searchId: uuid()
      .notNull()
      .unique()
      .references(() => searches.id, { onDelete: 'cascade' }),
    exaRunId: text().notNull().unique(),
    effort: text().notNull(),
    status: text().notNull(),
    stopReason: text(),
    costDollars: doublePrecision(),
    usage: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index().on(table.status)],
)
