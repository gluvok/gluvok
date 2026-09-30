/**
 * @file lib/validation/users.ts
 * @description Zod validation schemas for User creation and editing operations.
 */

import { z } from "zod";
import { Role } from "@/lib/constants/enums";

export const MANAGEABLE_ROLES = [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.BASE] as const;

export const manageableRoleSchema = z.enum(MANAGEABLE_ROLES, {
  message: "Invalid role selected.",
});

export const addUserSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain alphanumeric characters and underscores",
      ),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    role: manageableRoleSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const editUserSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric characters and underscores")
      .optional(),
    role: manageableRoleSchema.optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export const accountSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain alphanumeric characters and underscores",
      ),
    password: z
      .string()
      .refine((val) => !val || val.length >= 6, {
        message: "Password must be at least 6 characters",
      })
      .optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export type AddUserInput = z.infer<typeof addUserSchema>;
export type EditUserInput = z.infer<typeof editUserSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
