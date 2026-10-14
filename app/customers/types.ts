import { z } from "zod";
import type { User, UsersApiResponse } from "@/app/users/types";

export type Customer = User;
export type CustomersApiResponse = UsersApiResponse;

export const createCustomerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(
      /^[a-z0-9_.-]+$/,
      "Username must contain only lowercase letters, numbers, hyphens, or underscores",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
  father_name: z.string().trim().max(100).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateCustomerSchema = z.object({
  id: z.number().int().positive("Invalid customer ID"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(
      /^[a-z0-9_.-]+$/,
      "Username must contain only lowercase letters, numbers, hyphens, or underscores",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
  father_name: z.string().trim().max(100).optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
