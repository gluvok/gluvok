/**
 * @file db/schema/shared.ts
 * @description Drizzle ORM schema for shared (SaaS) multi-factory database.
 */

import { pgTable, uuid, varchar, text, integer, boolean, decimal, uniqueIndex } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { timestamps } from "../columns.helpers"
import { Role, EntityKey, TableName, FieldRequirementMode } from "@/lib/constants/enums"
import { roleEnum, unitEnum, fieldRequirementModeEnum, commodities, profiles, weighments } from "./common"

export * from "./common"

export const factories = pgTable(TableName.FACTORIES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  ...timestamps,
})

export const configs = pgTable(TableName.CONFIGS, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().unique().references(() => factories.id, { onDelete: "restrict" }),
  aadharNumberMode: fieldRequirementModeEnum(EntityKey.AADHAR_NUMBER_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  govtIdMode: fieldRequirementModeEnum(EntityKey.GOVT_ID_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  ...timestamps,
})

export const centers = pgTable(TableName.CENTERS, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
})

export const rates = pgTable(TableName.RATES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  commodityId: integer(EntityKey.COMMODITY_ID).notNull().references(() => commodities.id, { onDelete: "restrict", onUpdate: "cascade" }),
  unitPrice: decimal(EntityKey.UNIT_PRICE, { precision: 12, scale: 2 }).notNull(),
  unit: unitEnum(EntityKey.UNIT).notNull(),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
})

export const users = pgTable(TableName.USERS, {
  id: uuid(EntityKey.ID).defaultRandom().primaryKey(),
  username: varchar(EntityKey.USERNAME, { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum(EntityKey.ROLE).notNull().default(Role.BASE),
  factoryId: integer(EntityKey.FACTORY_ID).references(() => factories.id, { onDelete: "restrict" }),
  isActive: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
})

export const customers = pgTable(TableName.CUSTOMERS, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  govtId: integer(EntityKey.GOVT_ID),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  fatherName: varchar(EntityKey.FATHER_NAME, { length: 255 }).notNull(),
  userId: uuid(EntityKey.USER_ID).unique().references(() => users.id, { onDelete: "restrict" }),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
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
