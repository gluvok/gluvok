/**
 * @file lib/validation/entries.ts
 * @description Zod schema and validation rules for Entries entities.
 */

import * as z from "zod";
import { EntryStatus, EntrySource } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import {
  integerIdSchema,
  optionalIntegerIdSchema,
  indianPlateSchema,
  optionalIndianPlateSchema,
  positiveWeightSchema,
  optionalPositiveWeightSchema,
} from "./helpers";

export const addEntrySchema = z.object({
  detected_vehicle_number: z.string().optional().nullable(),
  vehicle_number: indianPlateSchema("Vehicle Number"),
  weight: positiveWeightSchema("Weight"),
  source: z.enum([EntrySource.MANUAL, EntrySource.DEVICE]).optional(),
  center_id: integerIdSchema("Center"),
  user_id: optionalIntegerIdSchema("User").default(null),
  customer_id: optionalIntegerIdSchema("Customer").default(null),
  status: z
    .enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED])
    .default(EntryStatus.PENDING),
  images: z.array(z.string()).optional(),
});

export const addDeviceEntrySchema = z.object({
  detected_vehicle_number: z.string().min(1, ValidationMessage.REQUIRED("Detected vehicle number")),
  vehicle_number: indianPlateSchema("Vehicle Number"),
  weight: positiveWeightSchema("Weight"),
  center_id: integerIdSchema("Center"),
  status: z
    .enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED])
    .default(EntryStatus.PENDING),
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
