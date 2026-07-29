import { pgTable, uuid, varchar, text, integer, boolean, pgEnum, decimal, jsonb, bigint, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { timestamps } from "./columns.helpers"
import { Role, Unit, WeighmentType, EntityKey, TableName, DbEnum } from "@/lib/constants/enums"

export const roleEnum = pgEnum(DbEnum.ROLE, [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.MANAGER,
  Role.OPERATOR,
  Role.BASE,
  Role.HARDWARE,
])

export const unitEnum = pgEnum(DbEnum.UNIT, [
  Unit.KG,
  Unit.Q,
  Unit.GAL,
])

export const weighmentTypeEnum = pgEnum(DbEnum.WEIGHMENT_TYPE, [
  WeighmentType.IN,
  WeighmentType.OUT,
])

export const factories = pgTable(TableName.FACTORIES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  ...timestamps,
})

export const centers = pgTable(TableName.CENTERS, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
})

export const commodities = pgTable(TableName.COMMODITIES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull().unique(),
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
  govtId: integer(EntityKey.GOVT_ID).notNull(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  fatherName: varchar(EntityKey.FATHER_NAME, { length: 255 }).notNull(),
  userId: uuid(EntityKey.USER_ID).unique().references(() => users.id, { onDelete: "restrict" }),
  factoryId: integer(EntityKey.FACTORY_ID).notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
}, (table) => [
  uniqueIndex("customers_govt_id_factory_id_idx").on(table.govtId, table.factoryId)
])

export const profiles = pgTable(TableName.PROFILES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid(EntityKey.USER_ID).notNull().unique().references(() => users.id, { onDelete: "restrict" }),
  aadharNumber: varchar(EntityKey.AADHAR_NUMBER, { length: 12 }).notNull(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  role: roleEnum(EntityKey.ROLE).notNull().default(Role.BASE),
  ...timestamps,
})

export const weighments = pgTable(TableName.WEIGHMENTS, {
  id: bigint(EntityKey.ID, { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  vehicleNumber: varchar(EntityKey.VEHICLE_NUMBER, { length: 10 }).notNull(),
  weight: decimal(EntityKey.WEIGHT, { precision: 12, scale: 3 }).notNull(),
  images: jsonb(EntityKey.IMAGES).default([]),
  unit: unitEnum(EntityKey.UNIT).notNull().default(Unit.KG),
  type: weighmentTypeEnum(EntityKey.TYPE).notNull().default(WeighmentType.IN),
  rateId: integer(EntityKey.RATE_ID).notNull().references(() => rates.id, { onDelete: "restrict" }),
  centerId: integer(EntityKey.CENTER_ID).notNull().references(() => centers.id, { onDelete: "restrict" }),
  profileId: integer(EntityKey.PROFILE_ID).notNull().references(() => profiles.id, { onDelete: "restrict" }),
  customerId: integer(EntityKey.CUSTOMER_ID).notNull().references(() => customers.id, { onDelete: "restrict" }),
  isActive: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
})

// Relations
export const factoriesRelations = relations(factories, ({ many }) => ({
  centers: many(centers),
  users: many(users),
  customers: many(customers),
  rates: many(rates),
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
