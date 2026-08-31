/**
 * @file lib/validation/registry.ts
 * @description Zod schema and validation rules for Registry entities.
 */

import { ProjectSlug } from "@/lib/constants/enums";
import { addCenterSchema, editCenterSchema } from "./centers";
import { addCommoditySchema, editCommoditySchema } from "./commodities";
import { addRateSchema, editRateSchema } from "./rates";
import { addCustomerSchema, editCustomerSchema } from "./customers";
import {
  addEntrySchema,
  editEntrySchema,
  addWeighmentSchema,
  editWeighmentSchema,
} from "./weighments";
import { addUserSchema, editUserSchema } from "./users";

export type EntityAddSchema =
  | typeof addCenterSchema
  | typeof addCommoditySchema
  | typeof addRateSchema
  | typeof addCustomerSchema
  | typeof addEntrySchema
  | typeof addWeighmentSchema
  | typeof addUserSchema;

export type EntityEditSchema =
  | typeof editCenterSchema
  | typeof editCommoditySchema
  | typeof editRateSchema
  | typeof editCustomerSchema
  | typeof editEntrySchema
  | typeof editWeighmentSchema
  | typeof editUserSchema;

export const ENTITY_ADD_SCHEMAS: Record<ProjectSlug, EntityAddSchema> = {
  [ProjectSlug.CENTERS]: addCenterSchema,
  [ProjectSlug.COMMODITIES]: addCommoditySchema,
  [ProjectSlug.RATES]: addRateSchema,
  [ProjectSlug.CUSTOMERS]: addCustomerSchema,
  [ProjectSlug.ENTRIES]: addEntrySchema,
  [ProjectSlug.WEIGHMENTS]: addWeighmentSchema,
  [ProjectSlug.USERS]: addUserSchema,
};

export const ENTITY_EDIT_SCHEMAS: Record<ProjectSlug, EntityEditSchema> = {
  [ProjectSlug.CENTERS]: editCenterSchema,
  [ProjectSlug.COMMODITIES]: editCommoditySchema,
  [ProjectSlug.RATES]: editRateSchema,
  [ProjectSlug.CUSTOMERS]: editCustomerSchema,
  [ProjectSlug.ENTRIES]: editEntrySchema,
  [ProjectSlug.WEIGHMENTS]: editWeighmentSchema,
  [ProjectSlug.USERS]: editUserSchema,
};
