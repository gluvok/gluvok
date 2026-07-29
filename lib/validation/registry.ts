/**
 * @file lib/validation/registry.ts
 * @description Zod schema and validation rules for Registry entities.
 */

import { ProjectSlug } from "@/lib/constants/enums"
import { addCenterSchema, editCenterSchema } from "./centers"
import { addCommoditySchema, editCommoditySchema } from "./commodities"
import { addRateSchema, editRateSchema } from "./rates"
import { addCustomerSchema, editCustomerSchema } from "./customers"
import { addWeighmentSchema, editWeighmentSchema } from "./weighments"
import { addFactorySchema, editFactorySchema } from "./factories"
import { addProfileSchema, editProfileSchema } from "./profiles"
import { addConfigSchema, editConfigSchema } from "./configs"

export type EntityAddSchema =
  | typeof addCenterSchema
  | typeof addCommoditySchema
  | typeof addRateSchema
  | typeof addCustomerSchema
  | typeof addWeighmentSchema
  | typeof addFactorySchema
  | typeof addProfileSchema
  | typeof addConfigSchema

export type EntityEditSchema =
  | typeof editCenterSchema
  | typeof editCommoditySchema
  | typeof editRateSchema
  | typeof editCustomerSchema
  | typeof editWeighmentSchema
  | typeof editFactorySchema
  | typeof editProfileSchema
  | typeof editConfigSchema

export const ENTITY_ADD_SCHEMAS: Record<ProjectSlug, EntityAddSchema> = {
  [ProjectSlug.CENTERS]: addCenterSchema,
  [ProjectSlug.COMMODITIES]: addCommoditySchema,
  [ProjectSlug.RATES]: addRateSchema,
  [ProjectSlug.CUSTOMERS]: addCustomerSchema,
  [ProjectSlug.WEIGHMENTS]: addWeighmentSchema,
  [ProjectSlug.FACTORIES]: addFactorySchema,
  [ProjectSlug.PROFILES]: addProfileSchema,
  [ProjectSlug.CONFIGS]: addConfigSchema,
}

export const ENTITY_EDIT_SCHEMAS: Record<ProjectSlug, EntityEditSchema> = {
  [ProjectSlug.CENTERS]: editCenterSchema,
  [ProjectSlug.COMMODITIES]: editCommoditySchema,
  [ProjectSlug.RATES]: editRateSchema,
  [ProjectSlug.CUSTOMERS]: editCustomerSchema,
  [ProjectSlug.WEIGHMENTS]: editWeighmentSchema,
  [ProjectSlug.FACTORIES]: editFactorySchema,
  [ProjectSlug.PROFILES]: editProfileSchema,
  [ProjectSlug.CONFIGS]: editConfigSchema,
}

