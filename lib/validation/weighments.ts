/**
 * @file lib/validation/weighments.ts
 * @description Zod schema and validation rules for Entries and Weighments entities.
 */

import * as z from "zod";
import {
  ColumnLabel,
  Unit,
  EntryStatus,
  EntryType,
  EntityKey,
  WeighmentType,
} from "@/lib/constants/enums";
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
  [EntityKey.DETECTED_VEHICLE_NUMBER]: z.string().optional().nullable(),
  [EntityKey.VEHICLE_NUMBER]: z
    .string()
    .min(1, `${ColumnLabel.VEHICLE_NUMBER} plate number is required`)
    .max(15, `${ColumnLabel.VEHICLE_NUMBER} plate must be 15 characters or less`)
    .regex(
      INDIAN_PLATE_REGEX,
      `Must match standard Indian plate (e.g. MH04BG6491, PB10XY1234) or BH series (e.g. 22BH1234AA)`,
    )
    .refine(
      (val) => {
        if (/^\d{2}[\s.-]?BH/i.test(val)) return true;
        return STATE_CODES.includes(val.substring(0, 2).toUpperCase());
      },
      {
        message: `First two characters must be a valid Indian state or union territory code`,
      },
    ),
  [EntityKey.WEIGHT]: z.coerce
    .number({ message: `${ColumnLabel.WEIGHT} must be a number` })
    .positive(`Measured ${ColumnLabel.WEIGHT.toLowerCase()} must be a positive number`),
  [EntityKey.TYPE]: z.enum([EntryType.MANUAL, EntryType.AUTOMATIC]).optional(),
  [EntityKey.CENTER_ID]: integerIdSchema(ColumnLabel.CENTER),
  [EntityKey.USER_ID]: optionalIntegerIdSchema(ColumnLabel.USER),
  [EntityKey.CUSTOMER_ID]: optionalIntegerIdSchema(ColumnLabel.CUSTOMER),
  [EntityKey.STATUS]: z
    .enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED])
    .default(EntryStatus.PENDING),
  [EntityKey.IMAGES]: z.array(z.string()).optional(),
});

export const editEntrySchema = z.object({
  [EntityKey.VEHICLE_NUMBER]: z.string().optional(),
  [EntityKey.CUSTOMER_ID]: optionalIntegerIdSchema(ColumnLabel.CUSTOMER),
  [EntityKey.STATUS]: z
    .enum([EntryStatus.PENDING, EntryStatus.APPROVED, EntryStatus.REJECTED])
    .optional(),
  [EntityKey.IMAGES]: z.array(z.string()).optional(),
});

export const addWeighmentSchema = z.object({
  [EntityKey.IN_ENTRY_ID]: integerIdSchema("In-Entry"),
  [EntityKey.OUT_ENTRY_ID]: integerIdSchema("Out-Entry"),
  [EntityKey.UNIT]: z.enum([Unit.KG, Unit.Q, Unit.GAL]).default(Unit.KG),
  [EntityKey.TYPE]: z
    .enum([WeighmentType.UNASSIGNED, WeighmentType.IN, WeighmentType.OUT])
    .default(WeighmentType.UNASSIGNED),
});

export const editWeighmentSchema = z.object({
  [EntityKey.TYPE]: z
    .enum([WeighmentType.UNASSIGNED, WeighmentType.IN, WeighmentType.OUT])
    .optional(),
});
