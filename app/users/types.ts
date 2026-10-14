import { z } from "zod";

export const USER_ROLES = ["admin", "manager", "operator", "base", "hardware", "customer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES = ["admin", "manager", "operator", "base"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const HUMAN_ROLES = STAFF_ROLES;
export type HumanRole = StaffRole;

export interface User {
  id: number;
  username: string;
  name: string;
  father_name?: string | null;
  role: UserRole;
  factory_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export const userRoleEnum = z.enum(USER_ROLES);
export const staffRoleEnum = z.enum(STAFF_ROLES);
export const humanRoleEnum = staffRoleEnum;
export const assignableRoleEnum = z.enum(["admin", "manager", "operator", "base", "customer"]);

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
  father_name: z.string().trim().max(100).optional().or(z.literal("")),
  role: assignableRoleEnum,
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
  father_name: z.string().trim().max(100).optional().or(z.literal("")),
  role: assignableRoleEnum.optional(),
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
