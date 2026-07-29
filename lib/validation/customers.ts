/**
 * @file lib/validation/customers.ts
 * @description Zod schema and validation rules for Customers entities.
 */

import * as z from "zod"
import { EntityKey, ColumnLabel } from "@/lib/constants/enums"
import { integerIdSchema, nameSchema } from "./helpers"

const baseCustomerSchema = z.object({
  [EntityKey.GOVT_ID]: integerIdSchema(ColumnLabel.GOVT_ID),
  [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
  [EntityKey.FATHER_NAME]: nameSchema(ColumnLabel.FATHER_NAME),
  [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
  [EntityKey.USERNAME]: z
    .string()
    .min(3, `${ColumnLabel.USERNAME} must be at least 3 characters`)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  [EntityKey.PASSWORD]: z
    .string()
    .min(6, `${ColumnLabel.PASSWORD} must be at least 6 characters`)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
})

export const addCustomerSchema = baseCustomerSchema

export const editCustomerSchema = baseCustomerSchema
