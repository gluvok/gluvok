/**
 * @file db/schema/common.ts
 * @description Shared enums, base column fragments, and tables used by both shared and standalone schemas.
 *
 * Strategy: Tables that exist in both schemas (users, customers, centers, rates) are defined
 * as base column objects here. Each schema file spreads these bases and appends its own
 * factory-scoped FK columns where required (shared) or omits them (standalone).
 */

import { pgTable, varchar, text, integer, boolean, pgEnum, decimal, jsonb, bigint, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core"
import { Role, Unit, WeighmentType, EntityKey, TableName, DbEnum, FieldRequirementMode } from "@/lib/constants/enums"

/** Reusable timestamp columns — previously in db/columns.helpers.ts */
export const timestamps = {
  [EntityKey.CREATED_AT]: timestamp(EntityKey.CREATED_AT, { withTimezone: true }).defaultNow(),
  [EntityKey.UPDATED_AT]: timestamp(EntityKey.UPDATED_AT, { withTimezone: true }).defaultNow(),
} as const

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum(DbEnum.ROLE, [
  Role.ADMIN,
  Role.MANAGER,
  Role.OPERATOR,
  Role.BASE,
]);

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
  [EntityKey.ID]: integer(EntityKey.ID)
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  [EntityKey.USERNAME]: varchar(EntityKey.USERNAME, { length: 255 })
    .notNull()
    .unique(),
  password_hash: text("password_hash").notNull(),
  [EntityKey.ROLE]: roleEnum(EntityKey.ROLE).notNull().default(Role.BASE),
  [EntityKey.IS_ACTIVE]: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
} as const;

/** Core columns shared by every `customers` table variant. */
export const customerBaseColumns = {
  [EntityKey.ID]: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  [EntityKey.GOVT_ID]: integer(EntityKey.GOVT_ID),
  [EntityKey.NAME]: varchar(EntityKey.NAME, { length: 255 }).notNull(),
  [EntityKey.FATHER_NAME]: varchar(EntityKey.FATHER_NAME, { length: 255 }).notNull(),
  ...timestamps,
} as const

/** Core columns shared by every `centers` table variant. */
export const centerBaseColumns = {
  [EntityKey.ID]: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  [EntityKey.NAME]: varchar(EntityKey.NAME, { length: 255 }).notNull(),
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
    [EntityKey.ID]: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
    [EntityKey.COMMODITY_ID]: integer(EntityKey.COMMODITY_ID).notNull().references(() => commodities.id, { onDelete: "restrict", onUpdate: "cascade" }),
    [EntityKey.UNIT_PRICE]: decimal(EntityKey.UNIT_PRICE, { precision: 12, scale: 2 }).notNull(),
    [EntityKey.UNIT]: unitEnum(EntityKey.UNIT).notNull(),
    ...timestamps,
  } as const
}

/** Core columns shared by every `configs` table variant. */
export const configBaseColumns = {
  [EntityKey.ID]: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  [EntityKey.AADHAR_NUMBER_MODE]: fieldRequirementModeEnum(EntityKey.AADHAR_NUMBER_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  [EntityKey.GOVT_ID_MODE]: fieldRequirementModeEnum(EntityKey.GOVT_ID_MODE).notNull().default(FieldRequirementMode.OPTIONAL),
  ...timestamps,
} as const

// ---------------------------------------------------------------------------
// Tables defined entirely in common (identical across all schemas)
// ---------------------------------------------------------------------------

export const commodities = pgTable(TableName.COMMODITIES, {
  [EntityKey.ID]: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  [EntityKey.NAME]: varchar(EntityKey.NAME, { length: 255 }).notNull().unique(),
  ...timestamps,
})

/**
 * Core columns shared by every `profiles` table variant.
 * Takes usersTable reference lazily to attach foreign key constraint.
 */
export function profileBaseColumns(usersTable: { id: AnyPgColumn }) {
  return {
    [EntityKey.ID]: integer(EntityKey.ID)
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    [EntityKey.USER_ID]: integer(EntityKey.USER_ID)
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    [EntityKey.NAME]: varchar(EntityKey.NAME, { length: 255 }).notNull(),
    [EntityKey.AADHAR_NUMBER]: varchar(EntityKey.AADHAR_NUMBER, { length: 12 }),
    [EntityKey.ROLE]: roleEnum(EntityKey.ROLE).notNull().default(Role.BASE),
    ...timestamps,
  };
}

export const weighments = pgTable(TableName.WEIGHMENTS, {
  [EntityKey.ID]: bigint(EntityKey.ID, { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  [EntityKey.VEHICLE_NUMBER]: varchar(EntityKey.VEHICLE_NUMBER, { length: 10 }).notNull(),
  [EntityKey.WEIGHT]: decimal(EntityKey.WEIGHT, { precision: 12, scale: 3 }).notNull(),
  [EntityKey.IMAGES]: jsonb(EntityKey.IMAGES).default([]),
  [EntityKey.UNIT]: unitEnum(EntityKey.UNIT).notNull().default(Unit.KG),
  [EntityKey.TYPE]: weighmentTypeEnum(EntityKey.TYPE).notNull().default(WeighmentType.IN),
  [EntityKey.RATE_ID]: integer(EntityKey.RATE_ID),
  [EntityKey.CENTER_ID]: integer(EntityKey.CENTER_ID).notNull(),
  [EntityKey.PROFILE_ID]: integer(EntityKey.PROFILE_ID).notNull(),
  [EntityKey.CUSTOMER_ID]: integer(EntityKey.CUSTOMER_ID),
  [EntityKey.IS_ACTIVE]: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
})
