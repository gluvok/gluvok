import { z } from "zod";

export const USER_ROLES = ["admin", "manager", "operator", "base", "hardware"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const HUMAN_ROLES = ["admin", "manager", "operator", "base"] as const;
export type HumanRole = (typeof HUMAN_ROLES)[number];

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  factory_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export const userRoleEnum = z.enum(USER_ROLES);
export const humanRoleEnum = z.enum(HUMAN_ROLES);

export const createUserSchema = z.object({
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
  role: humanRoleEnum,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateUserSchema = z.object({
  id: z.number().int().positive("Invalid user ID"),
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
  role: humanRoleEnum,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

export const deleteUserSchema = z.union([
  z.object({ id: z.number().int().positive() }),
  z.object({ ids: z.array(z.number().int().positive()).min(1, "At least one ID required") }),
]);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

export interface UsersApiResponse {
  data: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
