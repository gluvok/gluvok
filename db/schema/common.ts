/**
 * @file db/schema/common.ts
 * @description Shared enums and common table definitions used by both shared and standalone schemas.
 */

import { pgTable, uuid, varchar, integer, boolean, pgEnum, decimal, jsonb, bigint } from "drizzle-orm/pg-core"
import { timestamps } from "../columns.helpers"
import { Role, Unit, WeighmentType, EntityKey, TableName, DbEnum, FieldRequirementMode } from "@/lib/constants/enums"

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

export const fieldRequirementModeEnum = pgEnum(DbEnum.FIELD_REQUIREMENT_MODE, [
  FieldRequirementMode.MANDATORY,
  FieldRequirementMode.OPTIONAL,
  FieldRequirementMode.NOT_REQUIRED,
])

export const commodities = pgTable(TableName.COMMODITIES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar(EntityKey.NAME, { length: 255 }).notNull().unique(),
  ...timestamps,
})

export const profiles = pgTable(TableName.PROFILES, {
  id: integer(EntityKey.ID).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid(EntityKey.USER_ID).notNull().unique(),
  aadharNumber: varchar(EntityKey.AADHAR_NUMBER, { length: 12 }),
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
  rateId: integer(EntityKey.RATE_ID).notNull(),
  centerId: integer(EntityKey.CENTER_ID).notNull(),
  profileId: integer(EntityKey.PROFILE_ID).notNull(),
  customerId: integer(EntityKey.CUSTOMER_ID).notNull(),
  isActive: boolean(EntityKey.IS_ACTIVE).notNull().default(true),
  ...timestamps,
})
