/**
 * @file db/schema/shared.ts
 * @description Drizzle ORM schema for shared (SaaS) multi-factory database.
 * Each table spreads its base column group from common.ts and appends factory-scoped FKs.
 */

import { pgTable, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { timestamps } from "./common"
import { EntityKey, TableName } from "@/lib/constants/enums"
import {
  userBaseColumns,
  customerBaseColumns,
  centerBaseColumns,
  configBaseColumns,
  rateBaseColumns,
  profileBaseColumns,
  commodities,
  weighments,
} from "./common"

export * from "./common"

export const factories = pgTable(TableName.FACTORIES, {
  [EntityKey.ID]: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  [EntityKey.NAME]: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  ...timestamps,
})

export const configs = pgTable(TableName.CONFIGS, {
  ...configBaseColumns,
  [EntityKey.FACTORY_ID]: integer(EntityKey.FACTORY_ID).notNull().unique().references(() => factories.id, { onDelete: "restrict" }),
})

export const centers = pgTable(TableName.CENTERS, {
  ...centerBaseColumns,
  [EntityKey.FACTORY_ID]: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
})

export const rates = pgTable(TableName.RATES, {
  ...rateBaseColumns(),
  [EntityKey.FACTORY_ID]: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
})

export const users = pgTable(TableName.USERS, {
  ...userBaseColumns,
  [EntityKey.FACTORY_ID]: integer(EntityKey.FACTORY_ID).references(() => factories.id, { onDelete: "restrict" }),
})

export const profiles = pgTable(TableName.PROFILES, profileBaseColumns(users))

export const customers = pgTable(TableName.CUSTOMERS, {
  ...customerBaseColumns,
  [EntityKey.USER_ID]: integer(EntityKey.USER_ID).unique().references(() => users.id, { onDelete: "restrict" }),
  [EntityKey.FACTORY_ID]: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("customers_govt_id_factory_id_idx")
    .on(table.govt_id, table.factory_id)
    .where(sql`${table.govt_id} IS NOT NULL`),
])

// Relations
export const factoriesRelations = relations(factories, ({ one, many }) => ({
  centers: many(centers),
  users: many(users),
  customers: many(customers),
  rates: many(rates),
  config: one(configs),
}))

export const configsRelations = relations(configs, ({ one }) => ({
  factory: one(factories, {
    fields: [configs.factory_id],
    references: [factories.id],
  }),
}))

export const centersRelations = relations(centers, ({ one, many }) => ({
  factory: one(factories, {
    fields: [centers.factory_id],
    references: [factories.id],
  }),
  weighments: many(weighments),
}))

export const commoditiesRelations = relations(commodities, ({ many }) => ({
  rates: many(rates),
}))

export const ratesRelations = relations(rates, ({ one, many }) => ({
  commodity: one(commodities, {
    fields: [rates.commodity_id],
    references: [commodities.id],
  }),
  factory: one(factories, {
    fields: [rates.factory_id],
    references: [factories.id],
  }),
  weighments: many(weighments),
}))

export const usersRelations = relations(users, ({ one }) => ({
  factory: one(factories, {
    fields: [users.factory_id],
    references: [factories.id],
  }),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.user_id],
  }),
  customer: one(customers, {
    fields: [users.id],
    references: [customers.user_id],
  }),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.user_id],
    references: [users.id],
  }),
  factory: one(factories, {
    fields: [customers.factory_id],
    references: [factories.id],
  }),
  weighments: many(weighments),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.user_id],
    references: [users.id],
  }),
  weighments: many(weighments),
}))

export const weighmentsRelations = relations(weighments, ({ one }) => ({
  rate: one(rates, {
    fields: [weighments.rate_id],
    references: [rates.id],
  }),
  center: one(centers, {
    fields: [weighments.center_id],
    references: [centers.id],
  }),
  profile: one(profiles, {
    fields: [weighments.profile_id],
    references: [profiles.id],
  }),
  customer: one(customers, {
    fields: [weighments.customer_id],
    references: [customers.id],
  }),
}))
