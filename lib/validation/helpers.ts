/**
 * @file lib/validation/helpers.ts
 * @description Zod schema and validation rules for Helpers entities.
 */

import * as z from "zod"

export const integerIdSchema = (fieldName: string) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? NaN : Number(val)),
    z
      .number({ message: `${fieldName} is required` })
      .int(`${fieldName} must be an integer`)
      .positive(`${fieldName} is required and must be a positive number`)
  )

export const optionalIntegerIdSchema = (fieldName: string) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z
      .number({ message: `${fieldName} must be an integer` })
      .int(`${fieldName} must be an integer`)
      .positive(`${fieldName} must be a positive integer`)
      .nullable(),
  )

export const uuidSchema = (fieldName: string) =>z.uuid(`${fieldName} must be a valid UUID`)

export const nameSchema = (fieldName: string, min = 3, max = 255) =>
  z.string()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .max(max, `${fieldName} must be ${max} characters or less`)

export const requiredStringSchema = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`)
