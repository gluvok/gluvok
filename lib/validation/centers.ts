/**
 * @file lib/validation/centers.ts
 * @description Zod schema and validation rules for Centers entities.
 */

import * as z from "zod";
import { EntityKey } from "@/lib/constants/enums";
import { ColumnLabel } from "@/lib/constants/enums";
import { nameSchema } from "./helpers";

const baseCenterSchema = z.object({
  [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
  [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
});

export const addCenterSchema = baseCenterSchema;

export const editCenterSchema = baseCenterSchema;
