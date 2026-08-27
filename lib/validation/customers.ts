/**
 * @file lib/validation/customers.ts
 * @description Zod schema and validation rules for Customers entities.
 */

import * as z from "zod";
import { EntityKey, ColumnLabel } from "@/lib/constants/enums";
import { nameSchema } from "./helpers";

const baseCustomerSchema = z
  .object({
    [EntityKey.GOVT_ID]: z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
        z.number().int().positive().nullable().optional(),
      )
      .transform((v) => (v === undefined || Number.isNaN(v) ? null : v)),
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.FATHER_NAME]: nameSchema(ColumnLabel.FATHER_NAME),
    [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
    [EntityKey.USERNAME]: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    [EntityKey.PASSWORD]: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    [EntityKey.CONFIRM_PASSWORD]: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    const rawUsername = data[EntityKey.USERNAME];
    const rawPassword = data[EntityKey.PASSWORD];
    const rawConfirm = data[EntityKey.CONFIRM_PASSWORD];

    const hasUsername = Boolean(rawUsername && rawUsername.trim().length > 0);
    const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0);

    if (hasPassword && !hasUsername) {
      ctx.addIssue({
        code: "custom",
        message: `${ColumnLabel.USERNAME} is required when setting a password`,
        path: [EntityKey.USERNAME],
      });
    }

    if (hasUsername && !hasPassword) {
      ctx.addIssue({
        code: "custom",
        message: `${ColumnLabel.PASSWORD} is required when providing a username`,
        path: [EntityKey.PASSWORD],
      });
    }

    if (hasUsername && rawUsername!.trim().length < 3) {
      ctx.addIssue({
        code: "custom",
        message: `${ColumnLabel.USERNAME} must be at least 3 characters`,
        path: [EntityKey.USERNAME],
      });
    }

    if (hasPassword && rawPassword!.trim().length < 6) {
      ctx.addIssue({
        code: "custom",
        message: `${ColumnLabel.PASSWORD} must be at least 6 characters`,
        path: [EntityKey.PASSWORD],
      });
    }

    if (hasPassword && rawPassword !== rawConfirm) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: [EntityKey.CONFIRM_PASSWORD],
      });
    }
  });

export const addCustomerSchema = baseCustomerSchema;

export const editCustomerSchema = baseCustomerSchema;
