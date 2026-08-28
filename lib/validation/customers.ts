/**
 * @file lib/validation/customers.ts
 * @description Zod schema and validation rules for Customers entities.
 */

import * as z from "zod";
import { ValidationMessage } from "@/lib/constants/messages";
import { nameSchema } from "./helpers";

const baseCustomerSchema = z
  .object({
    govt_id: z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
        z.number().int().positive().nullable().optional(),
      )
      .transform((v) => (v === undefined || Number.isNaN(v) ? null : v)),
    name: nameSchema("Name"),
    father_name: nameSchema("Father's Name"),
    factory_id: z.coerce.number().optional().nullable(),
    username: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    password: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    confirmPassword: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    const rawUsername = data.username;
    const rawPassword = data.password;
    const rawConfirm = data.confirmPassword;

    const hasUsername = Boolean(rawUsername && rawUsername.trim().length > 0);
    const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0);

    if (hasPassword && !hasUsername) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.USERNAME_REQUIRED_WITH_PASSWORD("Username"),
        path: ["username"],
      });
    }

    if (hasUsername && !hasPassword) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.PASSWORD_REQUIRED_WITH_USERNAME("Password"),
        path: ["password"],
      });
    }

    if (hasUsername && rawUsername!.trim().length < 3) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.MIN_LENGTH("Username", 3),
        path: ["username"],
      });
    }

    if (hasPassword && rawPassword!.trim().length < 6) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.MIN_LENGTH("Password", 6),
        path: ["password"],
      });
    }

    if (hasPassword && rawPassword !== rawConfirm) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.PASSWORDS_DO_NOT_MATCH,
        path: ["confirmPassword"],
      });
    }
  });

export const addCustomerSchema = baseCustomerSchema;

export const editCustomerSchema = baseCustomerSchema;
