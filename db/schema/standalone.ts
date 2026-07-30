/**
 * @file db/schema/standalone.ts
 * @description Drizzle ORM schema for dedicated (single-tenant) client databases.
 * Factory concept is removed: no `factories` table, no `factory_id` columns.
 * `configs` holds a single global row (no factory FK).
 */

import { pgTable, integer, uniqueIndex } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
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

/** Single global config row — no factory scoping needed */
export const configs = pgTable(TableName.CONFIGS, {
  ...configBaseColumns,
})

export const centers = pgTable(TableName.CENTERS, {
  ...centerBaseColumns,
})

export const rates = pgTable(TableName.RATES, {
  ...rateBaseColumns(),
})

export const users = pgTable(TableName.USERS, {
  ...userBaseColumns,
})

export const customers = pgTable(TableName.CUSTOMERS, {
  ...customerBaseColumns,
  userId: integer(EntityKey.USER_ID).unique().references(() => users.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("customers_govt_id_idx")
    .on(table.govtId)
    .where(sql`${table.govtId} IS NOT NULL`),
])

// Relations
export const centersRelations = relations(centers, ({ many }) => ({
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
  weighments: many(weighments),
}))

export const usersRelations = relations(users, ({ one }) => ({
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
