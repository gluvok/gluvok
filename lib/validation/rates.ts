/**
 * @file lib/validation/rates.ts
 * @description Zod schema and validation rules for Rates entities.
 */

import * as z from "zod";
import { EntityKey, Unit } from "@/lib/constants/enums";
import { ColumnLabel } from "@/lib/constants/enums";
import { integerIdSchema } from "./helpers";

export const addRateSchema = z.object({
  [EntityKey.COMMODITY_ID]: integerIdSchema(ColumnLabel.COMMODITY),
  [EntityKey.UNIT_PRICE]: z.coerce
    .number({ message: `${ColumnLabel.UNIT_PRICE} must be a number` })
    .positive(`${ColumnLabel.UNIT_PRICE} must be a positive number`),
  [EntityKey.UNIT]: z.enum(Unit, {
    message: `${ColumnLabel.UNIT} must be a valid unit (kg, q, or gal)`,
  }),
  [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
});

export const editRateSchema = addRateSchema;
