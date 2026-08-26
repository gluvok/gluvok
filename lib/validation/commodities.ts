/**
 * @file lib/validation/commodities.ts
 * @description Zod schema and validation rules for Commodities entities.
 */

import * as z from "zod";
import { EntityKey } from "@/lib/constants/enums";
import { ColumnLabel } from "@/lib/constants/enums";
import { nameSchema } from "./helpers";

const commodityNameField = nameSchema(ColumnLabel.NAME, 1, 100);

export const addCommoditySchema = z.object({
  [EntityKey.NAME]: commodityNameField,
});

export const editCommoditySchema = addCommoditySchema;
