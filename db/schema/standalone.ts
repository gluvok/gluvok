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
  [EntityKey.USER_ID]: integer(EntityKey.USER_ID).unique().references(() => users.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("customers_govt_id_idx")
    .on(table.govt_id)
    .where(sql`${table.govt_id} IS NOT NULL`),
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
    fields: [rates.commodity_id],
    references: [commodities.id],
  }),
  weighments: many(weighments),
}))

export const usersRelations = relations(users, ({ one }) => ({
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
