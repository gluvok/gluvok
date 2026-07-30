/**
 * @file lib/validation/dynamic.ts
 * @description Dynamic Zod validation schema generator based on active FactoryConfig.
 */

import * as z from "zod"
import { EntityKey, ColumnLabel, FieldRequirementMode, Role } from "@/lib/constants/enums"
import { type FactoryConfig } from "@/lib/store/config"
import { integerIdSchema, nameSchema } from "./helpers"

/**
 * Dynamic Aadhaar schema generator based on active configuration mode.
 */
function buildAadharSchema(config: FactoryConfig | null): z.ZodTypeAny {
  const aadharMode = config?.aadharNumberMode ?? FieldRequirementMode.OPTIONAL

  if (aadharMode === FieldRequirementMode.MANDATORY) {
    return z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : (val === null || val === undefined ? "" : val)),
        z
          .string({ message: `${ColumnLabel.AADHAR_NUMBER} is required` })
          .min(1, `${ColumnLabel.AADHAR_NUMBER} is required`)
          .length(12, `${ColumnLabel.AADHAR_NUMBER} must be exactly 12 digits`)
          .regex(/^\d+$/, `${ColumnLabel.AADHAR_NUMBER} must contain only digits`)
      )
  }

  if (aadharMode === FieldRequirementMode.OPTIONAL) {
    return z
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
  }

  // NOT_REQUIRED
  return z.any().transform(() => null)
}

/**
 * Shared password refinement validation for add and edit forms.
 */
function validatePasswordRefinement(
  data: { [EntityKey.PASSWORD]?: string; [EntityKey.CONFIRM_PASSWORD]?: string },
  ctx: z.RefinementCtx,
  isEdit: boolean
) {
  const rawPassword = data[EntityKey.PASSWORD]
  const rawConfirm = data[EntityKey.CONFIRM_PASSWORD]
  const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0)
  const hasConfirm = Boolean(rawConfirm && rawConfirm.trim().length > 0)

  if (!isEdit && !hasPassword) {
    ctx.addIssue({
      code: "custom",
      message: `${ColumnLabel.PASSWORD} must be at least 6 characters`,
      path: [EntityKey.PASSWORD],
    })
  }

  if (hasPassword && rawPassword!.trim().length < 6) {
    ctx.addIssue({
      code: "custom",
      message: `${ColumnLabel.PASSWORD} must be at least 6 characters`,
      path: [EntityKey.PASSWORD],
    })
  }

  if ((!isEdit || hasPassword) && !hasConfirm) {
    ctx.addIssue({
      code: "custom",
      message: "Please confirm your password",
      path: [EntityKey.CONFIRM_PASSWORD],
    })
  } else if (hasPassword && rawPassword !== rawConfirm) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match",
      path: [EntityKey.CONFIRM_PASSWORD],
    })
  }
}

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

  return z
    .object({
      [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
      [EntityKey.FATHER_NAME]: nameSchema(ColumnLabel.FATHER_NAME),
      [EntityKey.GOVT_ID]: govtIdSchema,
      [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
      [EntityKey.USERNAME]: z
        .string()
        .optional()
        .or(z.literal("")),
      [EntityKey.PASSWORD]: z
        .string()
        .optional()
        .or(z.literal("")),
      [EntityKey.CONFIRM_PASSWORD]: z
        .string()
        .optional()
        .or(z.literal("")),
      [EntityKey.IS_ACTIVE]: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      const rawUsername = data[EntityKey.USERNAME]
      const rawPassword = data[EntityKey.PASSWORD]
      const hasUsername = Boolean(rawUsername && rawUsername.trim().length > 0)
      const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0)

      if (hasPassword && !hasUsername) {
        ctx.addIssue({
          code: "custom",
          message: `${ColumnLabel.USERNAME} is required when setting a password`,
          path: [EntityKey.USERNAME],
        })
      }

      if (hasUsername && !hasPassword) {
        ctx.addIssue({
          code: "custom",
          message: `${ColumnLabel.PASSWORD} is required when providing a username`,
          path: [EntityKey.PASSWORD],
        })
      }

      if (hasUsername && rawUsername!.trim().length < 3) {
        ctx.addIssue({
          code: "custom",
          message: `${ColumnLabel.USERNAME} must be at least 3 characters`,
          path: [EntityKey.USERNAME],
        })
      }

      validatePasswordRefinement(data, ctx, true)
    })
}

export function getDynamicProfileSchema(config: FactoryConfig | null, isEdit = false) {
  const aadharSchema = buildAadharSchema(config)

  const passwordField = isEdit
    ? z.string().optional().or(z.literal(""))
    : z.string().min(6, `${ColumnLabel.PASSWORD} must be at least 6 characters`)

  const confirmField = isEdit
    ? z.string().optional().or(z.literal(""))
    : z.string({ message: "Please confirm your password" }).min(1, "Please confirm your password")

  return z
    .object({
      [EntityKey.USERNAME]: z
        .string()
        .min(3, `${ColumnLabel.USERNAME} must be at least 3 characters`),
      [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
      [EntityKey.ROLE]: z.nativeEnum(Role, {
        message: "Please select a valid role",
      }),
      [EntityKey.AADHAR_NUMBER]: aadharSchema,
      [EntityKey.PASSWORD]: passwordField,
      [EntityKey.CONFIRM_PASSWORD]: confirmField,
      [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
      ...(isEdit ? { [EntityKey.IS_ACTIVE]: z.boolean().optional() } : {}),
    })
    .superRefine((data, ctx) => validatePasswordRefinement(data, ctx, isEdit))
}
