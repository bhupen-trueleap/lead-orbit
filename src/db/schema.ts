import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  customType,
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

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
})

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
    searchVector: tsvector().generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))`,
    ),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.type),
    index().on(table.name),
    index('entities_search_vector_index').using('gin', table.searchVector),
  ],
)

export const entityAttributes = pgTable(
  'entity_attributes',
  {
    id: uuid().primaryKey().defaultRandom(),
    entityId: uuid()
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    value: text().notNull(),
    valueNumber: doublePrecision(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.entityId, table.key)],
)

export const webPages = pgTable(
  'web_pages',
  {
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
    searchVector: tsvector().generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(text, ''))`,
    ),
    fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('web_pages_search_vector_index').using('gin', table.searchVector),
  ],
)

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
    createdByEmail: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.createdByEmail, table.createdAt)],
)

export const exaRequests = pgTable(
  'exa_requests',
  {
    id: uuid().primaryKey().defaultRandom(),
    searchId: uuid().references(() => searches.id, { onDelete: 'set null' }),
    exaRequestId: text(),
    request: jsonb().$type<Record<string, unknown>>().notNull(),
    resolvedSearchType: text(),
    costDollars: doublePrecision(),
    searchTimeMs: doublePrecision(),
    resultCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.searchId), index().on(table.createdAt)],
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
    source: text(),
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
