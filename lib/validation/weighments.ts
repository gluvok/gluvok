/**
 * @file lib/validation/weighments.ts
 * @description Zod schema and validation rules for Entries and Weighments entities.
 */

import * as z from "zod";
import { Unit, EntryStatus, EntryType, WeighmentType } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { integerIdSchema, optionalIntegerIdSchema } from "./helpers";

const STATE_CODES = [
  "AN",
  "AP",
  "AR",
  "AS",
  "BR",
  "CH",
  "CG",
  "DD",
  "DL",
  "DN",
  "GA",
  "GJ",
  "HR",
  "HP",
  "JK",
  "JH",
  "KA",
  "KL",
  "LA",
  "LD",
  "MP",
  "MH",
  "MN",
  "ML",
  "MZ",
  "NL",
  "OD",
  "OR",
  "PB",
  "PY",
  "RJ",
  "SK",
  "TN",
  "TS",
  "TR",
  "UP",
  "UA",
  "UK",
  "WB",
];

const INDIAN_PLATE_REGEX =
  /^(?:([A-Z]{2})[\s.-]?([A-Z0-9]{1,2})[\s.-]?([A-Za-z]{1,3})[\s.-]?(\d{3,4})|(\d{2})[\s.-]?(BH)[\s.-]?(\d{4})[\s.-]?([A-Za-z]{1,2}))$/i;

export const addEntrySchema = z.object({
  detected_vehicle_number: z.string().optional().nullable(),
  vehicle_number: z
    .string()
    .min(1, ValidationMessage.INDIAN_PLATE_REQUIRED("Vehicle Number"))
    .max(15, ValidationMessage.INDIAN_PLATE_MAX("Vehicle Number", 15))
    .regex(INDIAN_PLATE_REGEX, ValidationMessage.INDIAN_PLATE_FORMAT)
    .refine(
      (val) => {
        if (/^\d{2}[\s.-]?BH/i.test(val)) return true;
        return STATE_CODES.includes(val.substring(0, 2).toUpperCase());
      },
      {
        message: ValidationMessage.INDIAN_PLATE_STATE,
      },
    ),
  weight: z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER("Weight") })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER("Weight")),
  type: z.enum([EntryType.MANUAL, EntryType.AUTOMATIC]).optional(),
  center_id: integerIdSchema("Center"),
  user_id: optionalIntegerIdSchema("User"),
  customer_id: optionalIntegerIdSchema("Customer"),
  status: z
    .enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED])
    .default(EntryStatus.PENDING),
  images: z.array(z.string()).optional(),
});

export const addDeviceEntrySchema = z.object({
  detected_vehicle_number: z.string().min(1, ValidationMessage.REQUIRED("Detected vehicle number")),
  vehicle_number: z
    .string()
    .min(1, ValidationMessage.INDIAN_PLATE_REQUIRED("Vehicle Number"))
    .max(15, ValidationMessage.INDIAN_PLATE_MAX("Vehicle Number", 15))
    .regex(INDIAN_PLATE_REGEX, ValidationMessage.INDIAN_PLATE_FORMAT)
    .refine(
      (val) => {
        if (/^\d{2}[\s.-]?BH/i.test(val)) return true;
        return STATE_CODES.includes(val.substring(0, 2).toUpperCase());
      },
      {
        message: ValidationMessage.INDIAN_PLATE_STATE,
      },
    ),
  weight: z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER("Weight") })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER("Weight")),
  center_id: integerIdSchema("Center"),
  status: z
    .enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED])
    .default(EntryStatus.PENDING),
  images: z.array(z.string()).optional().default([]),
});

export const editEntrySchema = z.object({
  vehicle_number: z.string().optional(),
  customer_id: optionalIntegerIdSchema("Customer"),
  status: z.enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED]).optional(),
  images: z.array(z.string()).optional(),
});

export const addWeighmentSchema = z.object({
  in_entry_id: integerIdSchema("In-Entry"),
  out_entry_id: integerIdSchema("Out-Entry"),
  unit: z.enum([Unit.KG, Unit.Q, Unit.GAL]).default(Unit.KG),
  type: z
    .enum([WeighmentType.UNASSIGNED, WeighmentType.IN, WeighmentType.OUT])
    .default(WeighmentType.UNASSIGNED),
});

export const editWeighmentSchema = z.object({
  type: z.enum([WeighmentType.UNASSIGNED, WeighmentType.IN, WeighmentType.OUT]).optional(),
});
