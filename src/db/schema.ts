import {
  index,
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
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.type), index().on(table.name)],
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
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.entityId, table.key)],
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

export const searchResults = pgTable(
  'search_results',
  {
    searchId: uuid()
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),
    entityId: uuid()
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.searchId, table.entityId] }),
    index().on(table.entityId),
  ],
)

export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid().primaryKey().defaultRandom(),
    query: text().notNull(),
    createdByEmail: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.createdByEmail)],
)
