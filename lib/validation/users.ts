/**
 * @file lib/validation/users.ts
 * @description Zod schema and validation rules for Users entities.
 */

import * as z from "zod";
import { Role } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { nameSchema } from "./helpers";

export const addUserSchema = z
  .object({
    username: z.string().min(3, ValidationMessage.MIN_LENGTH("Username", 3)),
    password: z.string().min(6, ValidationMessage.MIN_LENGTH("Password", 6)),
    confirmPassword: z
      .string({ message: ValidationMessage.CONFIRM_PASSWORD_REQUIRED })
      .min(1, ValidationMessage.CONFIRM_PASSWORD_REQUIRED),
    aadhar_number: z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : val),
        z
          .string()
          .length(12, ValidationMessage.EXACT_DIGITS("Aadhar Number", 12))
          .regex(/^\d+$/, ValidationMessage.DIGITS_ONLY("Aadhar Number"))
          .optional()
          .nullable()
          .or(z.literal("")),
      )
      .transform((v) => (v === "" || v === undefined ? null : v)),
    name: nameSchema("Name"),
    role: z.enum(Role, {
      message: ValidationMessage.VALID_ROLE_REQUIRED,
    }),
    factory_id: z.coerce.number().optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: ValidationMessage.PASSWORDS_DO_NOT_MATCH,
    path: ["confirmPassword"],
  });

export const createUserSchema = addUserSchema;

export const editUserSchema = z
  .object({
    username: z.string().min(3, ValidationMessage.MIN_LENGTH("Username", 3)),
    aadhar_number: z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : val),
        z
          .string()
          .length(12, ValidationMessage.EXACT_DIGITS("Aadhar Number", 12))
          .regex(/^\d+$/, ValidationMessage.DIGITS_ONLY("Aadhar Number"))
          .optional()
          .nullable()
          .or(z.literal("")),
      )
      .transform((v) => (v === "" || v === undefined ? null : v)),
    name: nameSchema("Name"),
    role: z.enum(Role, {
      message: ValidationMessage.VALID_ROLE_REQUIRED,
    }),
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
    factory_id: z.coerce.number().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const rawPassword = data.password;
    const rawConfirm = data.confirmPassword;
    const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0);
    const hasConfirm = Boolean(rawConfirm && rawConfirm.trim().length > 0);

    if (hasPassword && rawPassword!.trim().length < 6) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.MIN_LENGTH("Password", 6),
        path: ["password"],
      });
    }

    if (hasPassword && !hasConfirm) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.CONFIRM_PASSWORD_REQUIRED,
        path: ["confirmPassword"],
      });
    } else if (hasPassword && rawPassword !== rawConfirm) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.PASSWORDS_DO_NOT_MATCH,
        path: ["confirmPassword"],
      });
    }
  });
