/**
 * @file lib/validation/profiles.ts
 * @description Zod schema and validation rules for Profiles entities.
 */

import * as z from "zod"
import { EntityKey, Role, ColumnLabel } from "@/lib/constants/enums"
import { nameSchema } from "./helpers"

export const addProfileSchema = z.object({
  [EntityKey.USERNAME]: z
    .string()
    .min(3, `${ColumnLabel.USERNAME} must be at least 3 characters`),
  [EntityKey.PASSWORD]: z
    .string()
    .min(6, `${ColumnLabel.PASSWORD} must be at least 6 characters`),
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

export const editProfileSchema = addProfileSchema.extend({
  [EntityKey.PASSWORD]: z
    .string()
    .min(6, `${ColumnLabel.PASSWORD} must be at least 6 characters`)
    .optional()
    .or(z.literal("")),
})
