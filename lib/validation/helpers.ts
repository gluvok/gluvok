/**
 * @file lib/validation/helpers.ts
 * @description Zod schema and validation rules for Helpers entities.
 */

import * as z from "zod";
import { ValidationMessage } from "@/lib/constants/messages";

export const integerIdSchema = (fieldName: string) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? NaN : Number(val)),
    z
      .number({ message: ValidationMessage.REQUIRED(fieldName) })
      .int(ValidationMessage.MUST_BE_INTEGER(fieldName))
      .positive(ValidationMessage.POSITIVE_INTEGER_REQUIRED(fieldName)),
  );

export const optionalIntegerIdSchema = (fieldName: string) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z
      .number({ message: ValidationMessage.MUST_BE_INTEGER(fieldName) })
      .int(ValidationMessage.MUST_BE_INTEGER(fieldName))
      .positive(ValidationMessage.MUST_BE_POSITIVE_INTEGER(fieldName))
      .nullable(),
  );

export const uuidSchema = (fieldName: string) => z.uuid(ValidationMessage.VALID_UUID(fieldName));

export const nameSchema = (fieldName: string, min = 3, max = 255) =>
  z
    .string()
    .min(min, ValidationMessage.MIN_LENGTH(fieldName, min))
    .max(max, ValidationMessage.MAX_LENGTH(fieldName, max));

export const requiredStringSchema = (fieldName: string) =>
  z.string().min(1, ValidationMessage.REQUIRED(fieldName));
