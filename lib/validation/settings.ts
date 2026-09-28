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
    receipt_images_per_row: z
      .number({ message: "Images per row must be a number." })
      .int("Images per row must be an integer.")
      .min(1, "Images per row must be at least 1.")
      .max(6, "Images per row cannot exceed 6.")
      .optional(),
  })
  .strict();

export type EditSettingsInput = z.infer<typeof editSettingsSchema>;
