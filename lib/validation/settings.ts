/**
 * @file lib/validation/settings.ts
 * @description Zod validation schemas for Settings entity.
 */

import * as z from "zod";
import { EntityKey, FieldRequirementMode, ColumnLabel } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { integerIdSchema } from "./helpers";

export const addSettingsSchema = z.object({
  [EntityKey.NAME]: z
    .string({ message: ValidationMessage.FACTORY_NAME_REQUIRED })
    .min(1, ValidationMessage.FACTORY_NAME_REQUIRED),
  [EntityKey.FACTORY_ID]: integerIdSchema(ColumnLabel.FACTORY_ID).optional().nullable(),
  [EntityKey.AADHAR_NUMBER_MODE]: z.enum(FieldRequirementMode, {
    message: ValidationMessage.VALID_AADHAR_MODE_REQUIRED,
  }),
  [EntityKey.GOVT_ID_MODE]: z.enum(FieldRequirementMode, {
    message: ValidationMessage.VALID_GOVT_ID_MODE_REQUIRED,
  }),
});

export const editSettingsSchema = addSettingsSchema;
