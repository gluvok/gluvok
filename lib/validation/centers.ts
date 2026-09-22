/**
 * @file lib/validation/centers.ts
 * @description Zod validation schemas for Centers CRUD operations.
 */

import { z } from "zod";

export const editCenterSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  auto_approve: z.boolean().optional(),
});

export type EditCenterInput = z.infer<typeof editCenterSchema>;
