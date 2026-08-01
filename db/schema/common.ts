/**
 * @file db/schema/common.ts
 * @description Shared enums, base column fragments, and tables used by both shared and standalone schemas.
 *
 * Strategy: Tables that exist in both schemas (users, customers, centers, rates) are defined
 * as base column objects here. Each schema file spreads these bases and appends its own
 * factory-scoped FK columns where required (shared) or omits them (standalone).
 */

import { pgTable, varchar, text, integer, boolean, pgEnum, decimal, jsonb, bigint, timestamp } from "drizzle-orm/pg-core"
import { Role, Unit, WeighmentType, EntityKey, TableName, DbEnum, FieldRequirementMode } from "@/lib/constants/enums"

/** Reusable timestamp columns — previously in db/columns.helpers.ts */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
} as const

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum(DbEnum.ROLE, [
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

export const fieldRequirementModeEnum = pgEnum(DbEnum.FIELD_REQUIREMENT_MODE, [
  FieldRequirementMode.MANDATORY,
  FieldRequirementMode.OPTIONAL,
  FieldRequirementMode.NOT_REQUIRED,
])

// ---------------------------------------------------------------------------
// Base column groups (spread into pgTable definitions in each schema file)
// These are plain objects — NOT tables — so they can be spread freely.
// ---------------------------------------------------------------------------

/** Core columns shared by every `users` table variant. */
export const userBaseColumns = {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  username: varchar(EntityKey.USERNAME, { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum(EntityKey.ROLE).notNull().default(Role.BASE),
  isActive: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
} as const

/** Core columns shared by every `customers` table variant. */
export const customerBaseColumns = {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  govtId: integer(EntityKey.GOVT_ID),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  fatherName: varchar(EntityKey.FATHER_NAME, { length: 255 }).notNull(),
  ...timestamps,
} as const

/** Core columns shared by every `centers` table variant. */
export const centerBaseColumns = {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  ...timestamps,
} as const

/**
 * Core columns shared by every `rates` table variant.
 * NOTE: defined as a function so each schema can inline the reference lazily,
 * but it references the shared `commodities` table — which is fine since both
 * schemas re-export it from common.ts.
 */
export function rateBaseColumns() {
  return {
    id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
    commodityId: integer(EntityKey.COMMODITY_ID).notNull().references(() => commodities.id, { onDelete: "restrict", onUpdate: "cascade" }),
    unitPrice: decimal(EntityKey.UNIT_PRICE, { precision: 12, scale: 2 }).notNull(),
    unit: unitEnum(EntityKey.UNIT).notNull(),
    ...timestamps,
  } as const
}

/** Core columns shared by every `configs` table variant. */
export const configBaseColumns = {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  aadharNumberMode: fieldRequirementModeEnum(EntityKey.AADHAR_NUMBER_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  govtIdMode: fieldRequirementModeEnum(EntityKey.GOVT_ID_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  ...timestamps,
} as const

// ---------------------------------------------------------------------------
// Tables defined entirely in common (identical across all schemas)
// ---------------------------------------------------------------------------

export const commodities = pgTable(TableName.COMMODITIES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull().unique(),
  ...timestamps,
})

export const profiles = pgTable(TableName.PROFILES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  userId: integer(EntityKey.USER_ID).notNull().unique(),
  aadharNumber: varchar(EntityKey.AADHAR_NUMBER, { length: 12 }),
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
  rateId: integer(EntityKey.RATE_ID).notNull(),
  centerId: integer(EntityKey.CENTER_ID).notNull(),
  profileId: integer(EntityKey.PROFILE_ID).notNull(),
  customerId: integer(EntityKey.CUSTOMER_ID).notNull(),
  isActive: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
})
