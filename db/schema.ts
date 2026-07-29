import { pgTable, uuid, varchar, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const roleEnum = pgEnum("role_enum", [
  "super_admin",
  "admin",
  "manager",
  "operator",
  "hardware",
  "base",
])

export const factories = pgTable("factories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("base"),
  factoryId: integer("factory_id").references(() => factories.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const profiles = pgTable("profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  aadharNumber: varchar("aadhar_number", { length: 12 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("operator"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
  factoryId: integer("factory_id").references(() => factories.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  fatherName: varchar("father_name", { length: 255 }),
  address: text("address"),
  bankName: varchar("bank_name", { length: 255 }),
  accountNumber: varchar("account_number", { length: 50 }),
  ifscCode: varchar("ifsc_code", { length: 20 }),
  kisanId: varchar("kisan_id", { length: 50 }),
  aadharNumber: varchar("aadhar_number", { length: 12 }),
  mobileNumber: varchar("mobile_number", { length: 15 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const usersRelations = relations(users, ({ one }) => ({
  factory: one(factories, {
    fields: [users.factoryId],
    references: [factories.id],
  }),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}))

export const customersRelations = relations(customers, ({ one }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  factory: one(factories, {
    fields: [customers.factoryId],
    references: [factories.id],
  }),
}))
