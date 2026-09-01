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
  "TS",
  "TR",
  "UP",
  "UA",
  "UK",
  "WB",
] as const;

export const INDIAN_PLATE_REGEX =
  /^(?:([A-Z]{2})[\s.-]?([A-Z0-9]{1,2})[\s.-]?([A-Za-z]{1,3})[\s.-]?(\d{3,4})|(\d{2})[\s.-]?(BH)[\s.-]?(\d{4})[\s.-]?([A-Za-z]{1,2}))$/i;

export const validateIndianPlateStateCode = (val: string): boolean => {
  if (/^\d{2}[\s.-]?BH/i.test(val)) return true;
  return (STATE_CODES as readonly string[]).includes(val.substring(0, 2).toUpperCase());
};

export const indianPlateSchema = (fieldName = "Vehicle Number") =>
  z
    .string()
    .min(1, ValidationMessage.INDIAN_PLATE_REQUIRED(fieldName))
    .max(15, ValidationMessage.INDIAN_PLATE_MAX(fieldName, 15))
    .regex(INDIAN_PLATE_REGEX, ValidationMessage.INDIAN_PLATE_FORMAT)
    .refine(validateIndianPlateStateCode, {
      message: ValidationMessage.INDIAN_PLATE_STATE,
    });

export const optionalIndianPlateSchema = (fieldName = "Vehicle Number") =>
  z
    .string()
    .max(15, ValidationMessage.INDIAN_PLATE_MAX(fieldName, 15))
    .regex(INDIAN_PLATE_REGEX, ValidationMessage.INDIAN_PLATE_FORMAT)
    .refine(validateIndianPlateStateCode, {
      message: ValidationMessage.INDIAN_PLATE_STATE,
    })
    .optional();

export const positiveWeightSchema = (fieldName = "Weight") =>
  z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER(fieldName) })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER(fieldName));

export const optionalPositiveWeightSchema = (fieldName = "Weight") =>
  z.coerce
    .number({ message: ValidationMessage.MUST_BE_NUMBER(fieldName) })
    .positive(ValidationMessage.MUST_BE_POSITIVE_NUMBER(fieldName))
    .optional();

