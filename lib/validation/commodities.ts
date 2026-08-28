/**
 * @file lib/validation/commodities.ts
 * @description Zod schema and validation rules for Commodities entities.
 */

import * as z from "zod";
import { nameSchema } from "./helpers";

const commodityNameField = nameSchema("Name", 1, 100);

export const addCommoditySchema = z.object({
  name: commodityNameField,
});

export const editCommoditySchema = addCommoditySchema;
