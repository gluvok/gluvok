/**
 * @file lib/validations/profile.ts
 * @description Zod validation schemas for profile creation and updates.
 */

import { z } from "zod"
import { Role } from "@/lib/constants/enums"

export const createProfileSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    aadharNumber: z
      .string()
      .length(12, "Aadhar number must be exactly 12 digits")
      .regex(/^\d+$/, "Aadhar number must contain only digits"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    role: z.nativeEnum(Role).optional().default(Role.BASE),
    factoryId: z.number().int().optional(),
    factory_id: z.number().int().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type CreateProfileInput = z.infer<typeof createProfileSchema>
