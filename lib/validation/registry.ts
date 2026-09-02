/**
 * @file lib/validation/registry.ts
 * @description Zod schema and validation rules for Registry entities.
 */

import { ProjectSlug } from "@/lib/constants/enums";
import { addCenterSchema, editCenterSchema } from "./centers";
import { addRateSchema, editRateSchema } from "./rates";
import { addCustomerSchema, editCustomerSchema } from "./customers";
import { addEntrySchema, editEntrySchema } from "./entries";
import { editWeighmentSchema } from "./weighments";
import { addUserSchema, editUserSchema } from "./users";
import { editSettingsSchema } from "./settings";
import { updateTicketConcernSchema } from "./tickets";

export type CreatableProjectSlug = Exclude<
  ProjectSlug,
  ProjectSlug.WEIGHMENTS | ProjectSlug.COMMODITIES | ProjectSlug.SETTINGS | ProjectSlug.TICKETS
>;

export type EditableProjectSlug = Exclude<ProjectSlug, ProjectSlug.COMMODITIES>;

export type EntityAddSchema =
  | typeof addCenterSchema
  | typeof addRateSchema
  | typeof addCustomerSchema
  | typeof addEntrySchema
  | typeof addUserSchema;

export type EntityEditSchema =
  | typeof editCenterSchema
  | typeof editRateSchema
  | typeof editCustomerSchema
  | typeof editEntrySchema
  | typeof editWeighmentSchema
  | typeof editUserSchema
  | typeof editSettingsSchema
  | typeof updateTicketConcernSchema;

export const ENTITY_ADD_SCHEMAS: Record<CreatableProjectSlug, EntityAddSchema> = {
  [ProjectSlug.CENTERS]: addCenterSchema,
  [ProjectSlug.RATES]: addRateSchema,
  [ProjectSlug.CUSTOMERS]: addCustomerSchema,
  [ProjectSlug.ENTRIES]: addEntrySchema,
  [ProjectSlug.USERS]: addUserSchema,
};

export const ENTITY_EDIT_SCHEMAS: Record<EditableProjectSlug, EntityEditSchema> = {
  [ProjectSlug.CENTERS]: editCenterSchema,
  [ProjectSlug.RATES]: editRateSchema,
  [ProjectSlug.CUSTOMERS]: editCustomerSchema,
  [ProjectSlug.ENTRIES]: editEntrySchema,
  [ProjectSlug.WEIGHMENTS]: editWeighmentSchema,
  [ProjectSlug.USERS]: editUserSchema,
  [ProjectSlug.SETTINGS]: editSettingsSchema,
  [ProjectSlug.TICKETS]: updateTicketConcernSchema,
};
