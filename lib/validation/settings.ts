/**
 * @file lib/validation/settings.ts
 * @description Zod validation schemas for Settings entity.
 */

import * as z from "zod";
import { FieldRequirementMode, ColumnLabel } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { integerIdSchema } from "./helpers";

export const addSettingsSchema = z.object({
  name: z
    .string({ message: ValidationMessage.FACTORY_NAME_REQUIRED })
    .min(1, ValidationMessage.FACTORY_NAME_REQUIRED),
  factory_id: integerIdSchema(ColumnLabel.FACTORY_ID).optional().nullable(),
  aadhar_number_mode: z.enum(FieldRequirementMode, {
    message: ValidationMessage.VALID_AADHAR_MODE_REQUIRED,
  }),
  govt_id_mode: z.enum(FieldRequirementMode, {
    message: ValidationMessage.VALID_GOVT_ID_MODE_REQUIRED,
  }),
});

export const editSettingsSchema = addSettingsSchema;
