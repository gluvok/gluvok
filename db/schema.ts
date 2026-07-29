import { pgTable, uuid, varchar, text, integer, boolean, pgEnum, decimal, jsonb, bigint } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { timestamps } from "./columns.helpers"

export const roleEnum = pgEnum("role_enum", [
  "super_admin",
  "admin",
  "manager",
  "operator",
  "base",
  "hardware",
])

export const unitEnum = pgEnum("unit_enum", [
  "kg",
  "q",
  "gal",
])

export const weighmentTypeEnum = pgEnum("weighment_type", [
  "in",
  "out",
])

export const factories = pgTable("factories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  ...timestamps,
})

export const centers = pgTable("centers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  factoryId: integer("factory_id").notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
})

export const commodities = pgTable("commodities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  ...timestamps,
})

export const rates = pgTable("rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  commodityId: integer("commodity_id").notNull().references(() => commodities.id, { onDelete: "restrict", onUpdate: "cascade" }),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  unit: unitEnum("unit").notNull(),
  factoryId: integer("factory_id").notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
})

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("base"),
  factoryId: integer("factory_id").notNull().references(() => factories.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
})

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  govtId: integer("govt_id").notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  fatherName: varchar("father_name", { length: 255 }).notNull(),
  userId: uuid("user_id").unique().references(() => users.id, { onDelete: "restrict" }),
  factoryId: integer("factory_id").notNull().references(() => factories.id, { onDelete: "restrict" }),
  ...timestamps,
})

export const profiles = pgTable("profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "restrict" }),
  aadharNumber: varchar("aadhar_number", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("base"),
  ...timestamps,
})

export const weighments = pgTable("weighments", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  vehicleNumber: varchar("vehicle_number", { length: 10 }).notNull(),
  weight: decimal("weight", { precision: 12, scale: 3 }).notNull(),
  images: jsonb("images").default([]),
  unit: unitEnum("unit").notNull().default("kg"),
  type: weighmentTypeEnum("type").notNull().default("in"),
  rateId: integer("rate_id").notNull().references(() => rates.id, { onDelete: "restrict" }),
  centerId: integer("center_id").notNull().references(() => centers.id, { onDelete: "restrict" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
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
