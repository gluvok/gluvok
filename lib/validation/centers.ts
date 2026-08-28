/**
 * @file lib/validation/centers.ts
 * @description Zod schema and validation rules for Centers entities.
 */

import * as z from "zod";
import { ColumnLabel } from "@/lib/constants/enums";
import { nameSchema } from "./helpers";

const baseCenterSchema = z.object({
  name: nameSchema(ColumnLabel.NAME),
  factory_id: z.coerce.number().optional().nullable(),
});

export const addCenterSchema = baseCenterSchema;

export const editCenterSchema = baseCenterSchema;
