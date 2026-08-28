/**
 * @file lib/validation/rates.ts
 * @description Zod schema and validation rules for Rates entities.
 */

import * as z from "zod";
import { Unit } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { integerIdSchema } from "./helpers";

export const addRateSchema = z.object({
  commodity_id: integerIdSchema("Commodity"),
  unit_price: z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER("Unit Price") })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER("Unit Price")),
  unit: z.enum(Unit, {
    message: ValidationMessage.VALID_UNIT_REQUIRED,
  }),
  factory_id: z.coerce.number().optional().nullable(),
});

export const editRateSchema = addRateSchema;
