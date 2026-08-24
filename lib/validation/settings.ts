/**
 * @file lib/validation/settings.ts
 * @description Zod validation schemas for Settings entity.
 */

import * as z from "zod"
import { EntityKey, FieldRequirementMode, ColumnLabel } from "@/lib/constants/enums"
import { integerIdSchema } from "./helpers"

export const addSettingsSchema = z.object({
  [EntityKey.NAME]: z.string({ message: "Factory Name is required" }).min(1, "Factory Name is required"),
  [EntityKey.FACTORY_ID]: integerIdSchema(ColumnLabel.FACTORY_ID).optional().nullable(),
  [EntityKey.AADHAR_NUMBER_MODE]: z.enum(FieldRequirementMode, {
    message: "Please select a valid Aadhaar Number mode",
  }),
  [EntityKey.GOVT_ID_MODE]: z.enum(FieldRequirementMode, {
    message: "Please select a valid Govt ID mode",
  }),
})

export const editSettingsSchema = addSettingsSchema
