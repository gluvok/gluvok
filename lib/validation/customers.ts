/**
 * @file lib/validation/customers.ts
 * @description Zod validation schemas for Customers CRUD operations.
 */

import { z } from "zod";

export const addCustomerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    father_name: z.string().min(1, "Father's name is required"),
    username: z
      .string()
      .regex(/^[a-zA-Z0-9_]*$/, "Username can only contain alphanumeric characters and underscores")
      .optional()
      .or(z.literal("")),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const hasUsername = Boolean(data.username && data.username.trim().length > 0);
      const hasPassword = Boolean(data.password && data.password.trim().length > 0);
      if (hasUsername && !hasPassword) return false;
      return true;
    },
    {
      message: "Password is required when providing a username",
      path: ["password"],
    },
  )
  .refine(
    (data) => {
      const hasUsername = Boolean(data.username && data.username.trim().length > 0);
      const hasPassword = Boolean(data.password && data.password.trim().length > 0);
      if (hasPassword && !hasUsername) return false;
      return true;
    },
    {
      message: "Username is required when providing a password",
      path: ["username"],
    },
  )
  .refine(
    (data) => {
      const hasPassword = Boolean(data.password && data.password.trim().length > 0);
      if (hasPassword) {
        return (data.password?.length ?? 0) >= 6;
      }
      return true;
    },
    {
      message: "Password must be at least 6 characters",
      path: ["password"],
    },
  )
  .refine(
    (data) => {
      const hasPassword = Boolean(data.password && data.password.trim().length > 0);
      if (hasPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export const editCustomerSchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    father_name: z.string().min(1, "Father's name is required").optional(),
    username: z
      .string()
      .regex(/^[a-zA-Z0-9_]*$/, "Username can only contain alphanumeric characters and underscores")
      .optional()
      .or(z.literal("")),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password.length >= 6;
      }
      return true;
    },
    {
      message: "Password must be at least 6 characters",
      path: ["password"],
    },
  )
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

export type AddCustomerInput = z.infer<typeof addCustomerSchema>;
export type EditCustomerInput = z.infer<typeof editCustomerSchema>;
