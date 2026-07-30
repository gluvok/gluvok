/**
 * @file db/schema/standalone.ts
 * @description Drizzle ORM schema for dedicated (single-tenant) client databases.
 * Factory concept is removed: no `factories` table, no `factory_id` columns.
 * `configs` holds a single global row (no factory FK).
 */

import { pgTable, uuid, varchar, text, integer, boolean, decimal, uniqueIndex } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { timestamps } from "../columns.helpers"
import { Role, EntityKey, TableName, FieldRequirementMode } from "@/lib/constants/enums"
import { roleEnum, unitEnum, fieldRequirementModeEnum, commodities, profiles, weighments } from "./common"

export * from "./common"

/** Single global config row — no factory scoping needed */
export const configs = pgTable(TableName.CONFIGS, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  aadharNumberMode: fieldRequirementModeEnum(EntityKey.AADHAR_NUMBER_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  govtIdMode: fieldRequirementModeEnum(EntityKey.GOVT_ID_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  ...timestamps,
})

export const centers = pgTable(TableName.CENTERS, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  ...timestamps,
})

export const rates = pgTable(TableName.RATES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  commodityId: integer(EntityKey.COMMODITY_ID).notNull().references(() => commodities.id, { onDelete: "restrict", onUpdate: "cascade" }),
  unitPrice: decimal(EntityKey.UNIT_PRICE, { precision: 12, scale: 2 }).notNull(),
  unit: unitEnum(EntityKey.UNIT).notNull(),
  ...timestamps,
})

export const users = pgTable(TableName.USERS, {
  id: uuid(EntityKey.ID).defaultRandom().primaryKey(),
  username: varchar(EntityKey.USERNAME, { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum(EntityKey.ROLE).notNull().default(Role.BASE),
  isActive: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
})

export const customers = pgTable(TableName.CUSTOMERS, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  govtId: integer(EntityKey.GOVT_ID),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  fatherName: varchar(EntityKey.FATHER_NAME, { length: 255 }).notNull(),
  userId: uuid(EntityKey.USER_ID).unique().references(() => users.id, { onDelete: "restrict" }),
  ...timestamps,
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
