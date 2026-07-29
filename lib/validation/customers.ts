/**
 * @file lib/validation/customers.ts
 * @description Zod schema and validation rules for Customers entities.
 */

import * as z from "zod"
import { EntityKey, ColumnLabel } from "@/lib/constants/enums"
import { integerIdSchema, nameSchema } from "./helpers"

const baseCustomerSchema = z
  .object({
    [EntityKey.GOVT_ID]: integerIdSchema(ColumnLabel.GOVT_ID),
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.FATHER_NAME]: nameSchema(ColumnLabel.FATHER_NAME),
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
  .superRefine((data, ctx) => {
    const rawUsername = data[EntityKey.USERNAME]
    const rawPassword = data[EntityKey.PASSWORD]
    const rawConfirm = data[EntityKey.CONFIRM_PASSWORD]

    const hasUsername = Boolean(rawUsername && rawUsername.trim().length > 0)
    const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0)

    if (hasPassword && !hasUsername) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ColumnLabel.USERNAME} is required when setting a password`,
        path: [EntityKey.USERNAME],
      })
    }

    if (hasUsername && !hasPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ColumnLabel.PASSWORD} is required when providing a username`,
        path: [EntityKey.PASSWORD],
      })
    }

    if (hasUsername && rawUsername!.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ColumnLabel.USERNAME} must be at least 3 characters`,
        path: [EntityKey.USERNAME],
      })
    }

    if (hasPassword && rawPassword!.trim().length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ColumnLabel.PASSWORD} must be at least 6 characters`,
        path: [EntityKey.PASSWORD],
      })
    }

    if (hasPassword && rawPassword !== rawConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: [EntityKey.CONFIRM_PASSWORD],
      })
    }
  })

export const addCustomerSchema = baseCustomerSchema

export const editCustomerSchema = baseCustomerSchema
