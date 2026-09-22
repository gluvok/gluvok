/**
 * @file lib/validation/helpers.ts
 * @description Zod schema and validation rules for Helpers entities.
 */

import * as z from "zod";
import { ValidationMessage } from "@/lib/constants/messages";

export const integerIdSchema = (fieldName: string) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return Number.isNaN(num) ? val : num;
    },
    z
      .number({ message: ValidationMessage.REQUIRED(fieldName) })
      .int(ValidationMessage.MUST_BE_INTEGER(fieldName))
      .positive(ValidationMessage.POSITIVE_INTEGER_REQUIRED(fieldName)),
  );

export const optionalIntegerIdSchema = (fieldName: string) =>
  z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === "" || val === null) return null;
      const num = Number(val);
      return Number.isNaN(num) ? val : num;
    },
    z
      .number({ message: ValidationMessage.MUST_BE_INTEGER(fieldName) })
      .int(ValidationMessage.MUST_BE_INTEGER(fieldName))
      .positive(ValidationMessage.MUST_BE_POSITIVE_INTEGER(fieldName))
      .nullable()
      .optional(),
  );

export const uuidSchema = (fieldName: string) => z.uuid(ValidationMessage.VALID_UUID(fieldName));

export const nameSchema = (fieldName: string, min = 3, max = 255) =>
  z
    .string()
    .min(min, ValidationMessage.MIN_LENGTH(fieldName, min))
    .max(max, ValidationMessage.MAX_LENGTH(fieldName, max));

export const requiredStringSchema = (fieldName: string) =>
  z.string().min(1, ValidationMessage.REQUIRED(fieldName));

export const STATE_CODES = [
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
  "TG",
  "TS",
  "TR",
  "UP",
  "UA",
  "UK",
  "WB",
] as const;

export const INDIAN_PLATE_REGEX =
  /^(?:([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})|([A-Z]{2})(\d{1,2})(\d{4})|(\d{2})(BH)(\d{4})([A-Z]{1,2})|([A-Z]{2})(VA)([A-Z]{2})(\d{4}))$/i;

export const validateIndianPlateStateCode = (val: string): boolean => {
  const clean = val
    .trim()
    .replace(/[\s.-]+/g, "")
    .toUpperCase();
  if (/^\d{2}BH/i.test(clean)) return true;
  return (STATE_CODES as readonly string[]).includes(clean.substring(0, 2));
};

export const cleanPlateString = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  return val
    .trim()
    .replace(/[\s.-]+/g, "")
    .toUpperCase();
};

export const isNoPlateDetectedText = (val: unknown): boolean => {
  if (typeof val !== "string") return false;
  const clean = val
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return clean === "noplatedetected";
};

export const isValidIndianPlate = (val: unknown): boolean => {
  if (typeof val !== "string") return false;
  const clean = cleanPlateString(val);
  if (typeof clean !== "string" || !clean || clean.length > 15) return false;
  if (!INDIAN_PLATE_REGEX.test(clean)) return false;
  return validateIndianPlateStateCode(clean);
};

export const indianPlateSchema = (fieldName = "Vehicle Number") =>
  z.preprocess(
    cleanPlateString,
    z
      .string({ message: ValidationMessage.INDIAN_PLATE_REQUIRED(fieldName) })
      .min(1, ValidationMessage.INDIAN_PLATE_REQUIRED(fieldName))
      .max(15, ValidationMessage.INDIAN_PLATE_MAX(fieldName, 15))
      .regex(INDIAN_PLATE_REGEX, ValidationMessage.INDIAN_PLATE_FORMAT)
      .refine(validateIndianPlateStateCode, {
        message: ValidationMessage.INDIAN_PLATE_STATE,
      }),
  );

export const optionalIndianPlateSchema = (fieldName = "Vehicle Number") =>
  z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null || val === "") return undefined;
      return cleanPlateString(val);
    },
    z
      .string()
      .max(15, ValidationMessage.INDIAN_PLATE_MAX(fieldName, 15))
      .regex(INDIAN_PLATE_REGEX, ValidationMessage.INDIAN_PLATE_FORMAT)
      .refine(validateIndianPlateStateCode, {
        message: ValidationMessage.INDIAN_PLATE_STATE,
      })
      .optional(),
  );

export const positiveWeightSchema = (fieldName = "Weight") =>
  z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER(fieldName) })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER(fieldName));

export const optionalPositiveWeightSchema = (fieldName = "Weight") =>
  z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER(fieldName) })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER(fieldName))
    .optional();
