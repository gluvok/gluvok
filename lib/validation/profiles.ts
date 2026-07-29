/**
 * @file lib/validation/profiles.ts
 * @description Zod schema and validation rules for Profiles entities.
 */

import * as z from "zod"
import { EntityKey, Role, ColumnLabel } from "@/lib/constants/enums"
import { nameSchema } from "./helpers"

export const addProfileSchema = z
  .object({
    [EntityKey.USERNAME]: z
      .string()
      .min(3, `${ColumnLabel.USERNAME} must be at least 3 characters`),
    [EntityKey.PASSWORD]: z
      .string()
      .min(6, `${ColumnLabel.PASSWORD} must be at least 6 characters`),
    [EntityKey.CONFIRM_PASSWORD]: z
      .string({ message: "Please confirm your password" })
      .min(1, "Please confirm your password"),
    [EntityKey.AADHAR_NUMBER]: z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : val),
        z
          .string()
          .length(12, `${ColumnLabel.AADHAR_NUMBER} must be exactly 12 digits`)
          .regex(/^\d+$/, `${ColumnLabel.AADHAR_NUMBER} must contain only digits`)
      ),
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.ROLE]: z.nativeEnum(Role, {
      message: "Please select a valid role",
    }),
    [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
  })
  .refine((data) => data[EntityKey.PASSWORD] === data[EntityKey.CONFIRM_PASSWORD], {
    message: "Passwords do not match",
    path: [EntityKey.CONFIRM_PASSWORD],
  })

export const createProfileSchema = addProfileSchema

export const editProfileSchema = z
  .object({
    [EntityKey.USERNAME]: z
      .string()
      .min(3, `${ColumnLabel.USERNAME} must be at least 3 characters`),
    [EntityKey.AADHAR_NUMBER]: z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : val),
        z
          .string()
          .length(12, `${ColumnLabel.AADHAR_NUMBER} must be exactly 12 digits`)
          .regex(/^\d+$/, `${ColumnLabel.AADHAR_NUMBER} must contain only digits`)
      ),
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.ROLE]: z.nativeEnum(Role, {
      message: "Please select a valid role",
    }),
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
    [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
    [EntityKey.IS_ACTIVE]: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const rawPassword = data[EntityKey.PASSWORD]
    const rawConfirm = data[EntityKey.CONFIRM_PASSWORD]
    const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0)

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
