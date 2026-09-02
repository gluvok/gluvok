/**
 * @file lib/validation/settings.ts
 * @description Zod validation schemas for Settings / Factory configuration operations.
 */

import { z } from "zod";

export const editSettingsSchema = z
  .object({
    name: z
      .string({ message: "Factory name must be a string." })
      .trim()
      .min(1, "Factory name is required.")
      .max(100, "Factory name cannot exceed 100 characters.")
      .optional(),
    check_center_on_merge: z.boolean().optional(),
  })
  .strict();

export type EditSettingsInput = z.infer<typeof editSettingsSchema>;
