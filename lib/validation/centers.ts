/**
 * @file lib/validation/centers.ts
 * @description Zod validation schemas for Centers CRUD operations.
 */

import { z } from "zod";

export const addCenterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  auto_approve: z.boolean().optional().default(false),
});

export const editCenterSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  auto_approve: z.boolean().optional(),
});

export type AddCenterInput = z.infer<typeof addCenterSchema>;
export type EditCenterInput = z.infer<typeof editCenterSchema>;
