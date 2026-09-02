/**
 * @file lib/validation/entries.ts
 * @description Zod schema and validation rules for Entries entities.
 */

import * as z from "zod";
import { EntryStatus, EntrySource } from "@/lib/constants/enums";
import {
  integerIdSchema,
  optionalIntegerIdSchema,
  indianPlateSchema,
  optionalIndianPlateSchema,
  positiveWeightSchema,
  optionalPositiveWeightSchema,
} from "./helpers";

export const entryStatusSchema = z
  .enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED])
  .default(EntryStatus.PENDING);

export const deviceVehicleNumberSchema = (fieldName = "Vehicle Number") =>
  z.union([z.literal("NO_PLATE_DETECTED"), indianPlateSchema(fieldName)]);

/**
 * Common schema fields shared across addEntrySchema and addDeviceEntrySchema.
 */
export const baseEntrySchema = z.object({
  weight: positiveWeightSchema("Weight"),
  center_id: integerIdSchema("Center"),
  status: entryStatusSchema,
});

export const addEntrySchema = baseEntrySchema.extend({
  vehicle_number: indianPlateSchema("Vehicle Number"),
  source: z.enum([EntrySource.MANUAL, EntrySource.DEVICE]).optional(),
  user_id: optionalIntegerIdSchema("User").default(null),
  customer_id: optionalIntegerIdSchema("Customer").default(null),
  images: z.array(z.string()).optional(),
});

export const addDeviceEntrySchema = baseEntrySchema.extend({
  detected_vehicle_number: deviceVehicleNumberSchema("Detected vehicle number"),
  images: z.array(z.string()).optional().default([]),
});

export const editEntrySchema = z.object({
  vehicle_number: optionalIndianPlateSchema("Vehicle Number"),
  weight: optionalPositiveWeightSchema("Weight"),
  center_id: optionalIntegerIdSchema("Center"),
  customer_id: optionalIntegerIdSchema("Customer"),
  status: z.enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED]).optional(),
  images: z.array(z.string()).optional(),
});

export type AddEntryInput = z.infer<typeof addEntrySchema>;
export type AddDeviceEntryInput = z.infer<typeof addDeviceEntrySchema>;
export type EditEntryInput = z.infer<typeof editEntrySchema>;
