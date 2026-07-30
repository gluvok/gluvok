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
  commodities,
  profiles,
  weighments,
} from "./common"

export * from "./common"

export const factories = pgTable(TableName.FACTORIES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  ...timestamps,
})

export const configs = pgTable(TableName.CONFIGS, {
  ...configBaseColumns,
  factoryId: integer(EntityKey.FACTORY_ID).notNull().unique().references(() => factories.id, { onDelete: "restrict" }),
})

export const centers = pgTable(TableName.CENTERS, {
  ...centerBaseColumns,
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
})

export const rates = pgTable(TableName.RATES, {
  ...rateBaseColumns(),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
})

export const users = pgTable(TableName.USERS, {
  ...userBaseColumns,
  factoryId: integer(EntityKey.FACTORY_ID).references(() => factories.id, { onDelete: "restrict" }),
})

export const customers = pgTable(TableName.CUSTOMERS, {
  ...customerBaseColumns,
  userId: integer(EntityKey.USER_ID).unique().references(() => users.id, { onDelete: "restrict" }),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("customers_govt_id_factory_id_idx")
    .on(table.govtId, table.factoryId)
    .where(sql`${table.govtId} IS NOT NULL`),
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
    fields: [configs.factoryId],
    references: [factories.id],
  }),
}))

export const centersRelations = relations(centers, ({ one, many }) => ({
  factory: one(factories, {
    fields: [centers.factoryId],
    references: [factories.id],
  }),
  weighments: many(weighments),
}))

export const commoditiesRelations = relations(commodities, ({ many }) => ({
  rates: many(rates),
}))

export const ratesRelations = relations(rates, ({ one, many }) => ({
  commodity: one(commodities, {
    fields: [rates.commodityId],
    references: [commodities.id],
  }),
  factory: one(factories, {
    fields: [rates.factoryId],
    references: [factories.id],
  }),
  weighments: many(weighments),
}))

export const usersRelations = relations(users, ({ one }) => ({
  factory: one(factories, {
    fields: [users.factoryId],
    references: [factories.id],
  }),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  customer: one(customers, {
    fields: [users.id],
    references: [customers.userId],
  }),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  factory: one(factories, {
    fields: [customers.factoryId],
    references: [factories.id],
  }),
  weighments: many(weighments),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  weighments: many(weighments),
}))

export const weighmentsRelations = relations(weighments, ({ one }) => ({
  rate: one(rates, {
    fields: [weighments.rateId],
    references: [rates.id],
  }),
  center: one(centers, {
    fields: [weighments.centerId],
    references: [centers.id],
  }),
  profile: one(profiles, {
    fields: [weighments.profileId],
    references: [profiles.id],
  }),
  customer: one(customers, {
    fields: [weighments.customerId],
    references: [customers.id],
  }),
}))
