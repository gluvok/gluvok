/**
 * @file lib/validation/rates.ts
 * @description Zod schema and validation rules for Rates entities.
 */

import * as z from "zod";
import { EntityKey, Unit, ColumnLabel } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { integerIdSchema } from "./helpers";

export const addRateSchema = z.object({
  [EntityKey.COMMODITY_ID]: integerIdSchema(ColumnLabel.COMMODITY),
  [EntityKey.UNIT_PRICE]: z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER(ColumnLabel.UNIT_PRICE) })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER(ColumnLabel.UNIT_PRICE)),
  [EntityKey.UNIT]: z.enum(Unit, {
    message: ValidationMessage.VALID_UNIT_REQUIRED,
  }),
  [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
});

export const editRateSchema = addRateSchema;
