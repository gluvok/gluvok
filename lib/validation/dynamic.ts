/**
 * @file lib/validation/dynamic.ts
 * @description Dynamic Zod validation schema generator based on the active factory.
 */

import * as z from "zod";
import { EntityKey, ColumnLabel, FieldRequirementMode, Role } from "@/lib/constants/enums";
import { ValidationMessage } from "@/lib/constants/messages";
import { type Factory } from "@/types";
import { integerIdSchema, nameSchema } from "./helpers";

/**
 * Dynamic Aadhaar schema generator based on active configuration mode.
 */
function buildAadharSchema(factory: Factory | null): z.ZodTypeAny {
  const aadharMode = factory?.aadhar_number_mode ?? FieldRequirementMode.MANDATORY;

  if (aadharMode === FieldRequirementMode.MANDATORY) {
    return z.preprocess(
      (val) =>
        typeof val === "string"
          ? val.replace(/\s/g, "")
          : val === null || val === undefined
            ? ""
            : val,
      z
        .string({ message: ValidationMessage.REQUIRED(ColumnLabel.AADHAR_NUMBER) })
        .min(1, ValidationMessage.REQUIRED(ColumnLabel.AADHAR_NUMBER))
        .length(12, ValidationMessage.EXACT_DIGITS(ColumnLabel.AADHAR_NUMBER, 12))
        .regex(/^\d+$/, ValidationMessage.DIGITS_ONLY(ColumnLabel.AADHAR_NUMBER)),
    );
  }

  if (aadharMode === FieldRequirementMode.OPTIONAL) {
    return z
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
      .transform((v) => (v === "" || v === undefined ? null : v));
  }

  // NOT_REQUIRED
  return z.any().transform(() => null);
}

/**
 * Shared username/password refinement validation for add and edit forms.
 *
 * Rules:
 * - In ADD mode (isEdit=false):
 *   - username >= 3 chars
 *   - password >= 6 chars (required)
 *   - confirmPassword required and must match password
 *
 * - In EDIT mode (isEdit=true):
 *   - If new password is blank -> valid (keep unchanged)
 *   - If new password is provided -> must be >= 6 chars, confirmPassword required, and must match
 */
export function validatePasswordRefinement(
  data: {
    [EntityKey.USERNAME]?: string;
    [EntityKey.PASSWORD]?: string;
    [EntityKey.CONFIRM_PASSWORD]?: string;
    confirm_password?: string;
  },
  ctx: z.RefinementCtx,
  isEdit: boolean,
  requireUsername = true,
) {
  const rawUsername = data[EntityKey.USERNAME];
  const rawPassword = data[EntityKey.PASSWORD];
  const rawConfirm = data[EntityKey.CONFIRM_PASSWORD] ?? data.confirm_password;

  const hasUsername = Boolean(rawUsername && rawUsername.trim().length > 0);
  const hasPassword = Boolean(rawPassword && rawPassword.trim().length > 0);
  const hasConfirm = Boolean(rawConfirm && rawConfirm.trim().length > 0);

  // 1. Username validation
  if (!hasUsername) {
    if ((requireUsername && !isEdit) || hasPassword) {
      ctx.addIssue({
        code: "custom",
        message: hasPassword
          ? ValidationMessage.USERNAME_REQUIRED_WITH_PASSWORD(ColumnLabel.USERNAME)
          : ValidationMessage.REQUIRED(ColumnLabel.USERNAME),
        path: [EntityKey.USERNAME],
      });
    }
  } else if (rawUsername!.trim().length < 3) {
    ctx.addIssue({
      code: "custom",
      message: ValidationMessage.MIN_LENGTH(ColumnLabel.USERNAME, 3),
      path: [EntityKey.USERNAME],
    });
  }

  // 2. Password presence check
  const isPasswordRequired = !isEdit && (requireUsername || hasUsername);
  if (isPasswordRequired && !hasPassword) {
    ctx.addIssue({
      code: "custom",
      message: ValidationMessage.REQUIRED(ColumnLabel.PASSWORD),
      path: [EntityKey.PASSWORD],
    });
  }

  // 3. Password length check (if provided)
  if (hasPassword && rawPassword!.trim().length < 6) {
    ctx.addIssue({
      code: "custom",
      message: ValidationMessage.MIN_LENGTH(ColumnLabel.PASSWORD, 6),
      path: [EntityKey.PASSWORD],
    });
  }

  // 4. Confirm password check & equality check
  const isConfirmRequired = hasPassword || isPasswordRequired;
  if (isConfirmRequired && !hasConfirm) {
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
}

export function getDynamicCustomerSchema(factory: Factory | null, isEdit = false) {
  const govtIdMode = factory?.govt_id_mode ?? FieldRequirementMode.MANDATORY;

  let govtIdSchema: z.ZodTypeAny;
  if (govtIdMode === FieldRequirementMode.MANDATORY) {
    govtIdSchema = integerIdSchema(ColumnLabel.GOVT_ID);
  } else if (govtIdMode === FieldRequirementMode.OPTIONAL) {
    govtIdSchema = z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
        z.number().int().positive().nullable().optional(),
      )
      .transform((v) => (v === undefined || Number.isNaN(v) ? null : v));
  } else {
    // NOT_REQUIRED
    govtIdSchema = z.any().transform(() => null);
  }

  return z
    .object({
      [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
      [EntityKey.FATHER_NAME]: nameSchema(ColumnLabel.FATHER_NAME),
      [EntityKey.GOVT_ID]: govtIdSchema,
      [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
      [EntityKey.USERNAME]: z.string().optional().or(z.literal("")),
      [EntityKey.PASSWORD]: z.string().optional().or(z.literal("")),
      [EntityKey.CONFIRM_PASSWORD]: z.string().optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      validatePasswordRefinement(data, ctx, isEdit, false);
    });
}

export function getDynamicUserSchema(factory: Factory | null, isEdit = false) {
  const aadharSchema = buildAadharSchema(factory);

  return z
    .object({
      [EntityKey.USERNAME]: z.string().optional().or(z.literal("")),
      [EntityKey.NAME]: nameSchema(ColumnLabel.NAME),
      [EntityKey.ROLE]: z.enum(Role, {
        message: ValidationMessage.VALID_ROLE_REQUIRED,
      }),
      [EntityKey.AADHAR_NUMBER]: aadharSchema,
      [EntityKey.PASSWORD]: z.string().optional().or(z.literal("")),
      [EntityKey.CONFIRM_PASSWORD]: z.string().optional().or(z.literal("")),
      [EntityKey.FACTORY_ID]: z.coerce.number().optional().nullable(),
    })
    .superRefine((data, ctx) => validatePasswordRefinement(data, ctx, isEdit, true));
}
