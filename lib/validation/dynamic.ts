/**
 * @file lib/validation/dynamic.ts
 * @description Dynamic Zod validation schema generator based on active FactoryConfig.
 */

import * as z from "zod"
import { EntityKey, ColumnLabel, FieldRequirementMode, Role } from "@/lib/constants/enums"
import { type FactoryConfig } from "@/lib/store/config"
import { integerIdSchema, nameSchema } from "./helpers"

export function getDynamicCustomerSchema(config: FactoryConfig | null) {
  const govtIdMode = config?.govtIdMode ?? FieldRequirementMode.OPTIONAL

  let govtIdSchema: z.ZodTypeAny
  if (govtIdMode === FieldRequirementMode.MANDATORY) {
    govtIdSchema = integerIdSchema(ColumnLabel.GOVT_ID)
  } else if (govtIdMode === FieldRequirementMode.OPTIONAL) {
    govtIdSchema = z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
        z.number().int().positive().nullable().optional()
      )
      .transform((v) => (v === undefined || Number.isNaN(v) ? null : v))
  } else {
    // NOT_REQUIRED
    govtIdSchema = z.any().transform(() => null)
  }

  return z.object({
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.FATHER_NAME]: nameSchema(ColumnLabel.FATHER_NAME),
    [EntityKey.GOVT_ID]: govtIdSchema,
    [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
    [EntityKey.USERNAME]: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    [EntityKey.PASSWORD]: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    [EntityKey.CONFIRM_PASSWORD]: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    [EntityKey.IS_ACTIVE]: z.boolean().optional(),
  })
}

export function getDynamicProfileSchema(config: FactoryConfig | null) {
  const aadharMode = config?.aadharNumberMode ?? FieldRequirementMode.OPTIONAL

  let aadharSchema: z.ZodTypeAny
  if (aadharMode === FieldRequirementMode.MANDATORY) {
    aadharSchema = z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : (val === null || val === undefined ? "" : val)),
        z
          .string({ message: `${ColumnLabel.AADHAR_NUMBER} is required` })
          .min(1, `${ColumnLabel.AADHAR_NUMBER} is required`)
          .length(12, `${ColumnLabel.AADHAR_NUMBER} must be exactly 12 digits`)
          .regex(/^\d+$/, `${ColumnLabel.AADHAR_NUMBER} must contain only digits`)
      )
  } else if (aadharMode === FieldRequirementMode.OPTIONAL) {
    aadharSchema = z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : val),
        z
          .string()
          .length(12, `${ColumnLabel.AADHAR_NUMBER} must be exactly 12 digits`)
          .regex(/^\d+$/, `${ColumnLabel.AADHAR_NUMBER} must contain only digits`)
          .optional()
          .nullable()
          .or(z.literal(""))
      )
      .transform((v) => (v === "" || v === undefined ? null : v))
  } else {
    // NOT_REQUIRED
    aadharSchema = z.any().transform(() => null)
  }

  return z.object({
    [EntityKey.USERNAME]: z
      .string()
      .min(3, `${ColumnLabel.USERNAME} must be at least 3 characters`),
    [EntityKey.PASSWORD]: z
      .string()
      .min(6, `${ColumnLabel.PASSWORD} must be at least 6 characters`),
    [EntityKey.CONFIRM_PASSWORD]: z
      .string({ message: "Please confirm your password" })
      .min(1, "Please confirm your password"),
    [EntityKey.AADHAR_NUMBER]: aadharSchema,
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.ROLE]: z.nativeEnum(Role, {
      message: "Please select a valid role",
    }),
    [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
  })
}
