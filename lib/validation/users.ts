/**
 * @file lib/validation/users.ts
 * @description Zod schema and validation rules for Users entities.
 */

import * as z from "zod";
import { EntityKey, Role, ColumnLabel } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { nameSchema } from "./helpers";

export const addUserSchema = z
  .object({
    [EntityKey.USERNAME]: z.string().min(3, ValidationMessage.MIN_LENGTH(ColumnLabel.USERNAME, 3)),
    [EntityKey.PASSWORD]: z.string().min(6, ValidationMessage.MIN_LENGTH(ColumnLabel.PASSWORD, 6)),
    [EntityKey.CONFIRM_PASSWORD]: z
      .string({ message: ValidationMessage.CONFIRM_PASSWORD_REQUIRED })
      .min(1, ValidationMessage.CONFIRM_PASSWORD_REQUIRED),
    [EntityKey.AADHAR_NUMBER]: z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : val),
        z
          .string()
          .length(12, ValidationMessage.EXACT_DIGITS(ColumnLabel.AADHAR_NUMBER, 12))
          .regex(/^\d+$/, ValidationMessage.DIGITS_ONLY(ColumnLabel.AADHAR_NUMBER))
          .optional()
          .nullable()
          .or(z.literal("")),
      )
      .transform((v) => (v === "" || v === undefined ? null : v)),
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.ROLE]: z.enum(Role, {
      message: ValidationMessage.VALID_ROLE_REQUIRED,
    }),
    [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
  })
  .refine((data) => data[EntityKey.PASSWORD] === data[EntityKey.CONFIRM_PASSWORD], {
    message: ValidationMessage.PASSWORDS_DO_NOT_MATCH,
    path: [EntityKey.CONFIRM_PASSWORD],
  });

export const createUserSchema = addUserSchema;

export const editUserSchema = z
  .object({
    [EntityKey.USERNAME]: z.string().min(3, ValidationMessage.MIN_LENGTH(ColumnLabel.USERNAME, 3)),
    [EntityKey.AADHAR_NUMBER]: z
      .preprocess(
        (val) => (typeof val === "string" ? val.replace(/\s/g, "") : val),
        z
          .string()
          .length(12, ValidationMessage.EXACT_DIGITS(ColumnLabel.AADHAR_NUMBER, 12))
          .regex(/^\d+$/, ValidationMessage.DIGITS_ONLY(ColumnLabel.AADHAR_NUMBER))
          .optional()
          .nullable()
          .or(z.literal("")),
      )
      .transform((v) => (v === "" || v === undefined ? null : v)),
    [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
    [EntityKey.ROLE]: z.enum(Role, {
      message: ValidationMessage.VALID_ROLE_REQUIRED,
    }),
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
    [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const rawPassword = data[EntityKey.PASSWORD];
    const rawConfirm = data[EntityKey.CONFIRM_PASSWORD];
    const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0);
    const hasConfirm = Boolean(rawConfirm && rawConfirm.trim().length > 0);

    if (hasPassword && rawPassword!.trim().length < 6) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.MIN_LENGTH(ColumnLabel.PASSWORD, 6),
        path: [EntityKey.PASSWORD],
      });
    }

    if (hasPassword && !hasConfirm) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.CONFIRM_PASSWORD_REQUIRED,
        path: [EntityKey.CONFIRM_PASSWORD],
      });
    } else if (hasPassword && rawPassword !== rawConfirm) {
      ctx.addIssue({
        code: "custom",
        message: ValidationMessage.PASSWORDS_DO_NOT_MATCH,
        path: [EntityKey.CONFIRM_PASSWORD],
      });
    }
  });
