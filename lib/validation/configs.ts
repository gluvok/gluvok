/**
 * @file lib/validation/configs.ts
 * @description Zod validation schemas for Config entity.
 */

import * as z from "zod"
import { EntityKey, FieldRequirementMode, ColumnLabel } from "@/lib/constants/enums"
import { integerIdSchema } from "./helpers"

export const addConfigSchema = z.object({
  [EntityKey.FACTORY_ID]: integerIdSchema(ColumnLabel.FACTORY_ID).optional().nullable(),
  [EntityKey.AADHAR_NUMBER_MODE]: z.enum(FieldRequirementMode, {
    message: "Please select a valid Aadhaar Number mode",
  }),
  [EntityKey.GOVT_ID_MODE]: z.enum(FieldRequirementMode, {
    message: "Please select a valid Govt ID mode",
  }),
})

export const editConfigSchema = addConfigSchema
