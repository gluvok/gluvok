import { z } from "zod";

export const USER_ROLES = ["admin", "manager", "operator", "base", "hardware", "customer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES = ["admin", "manager", "operator", "base"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface User {
  id: number;
  username: string | null;
  name: string;
  role: UserRole;
  factory_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export const userRoleEnum = z.enum(USER_ROLES);
export const staffRoleEnum = z.enum(STAFF_ROLES);
export const assignableRoleEnum = z.enum(["admin", "manager", "operator", "base", "customer"]);

// Reusable single-source field validation schemas
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username must not exceed 50 characters")
  .regex(
    /^[a-z0-9_.-]+$/,
    "Username must contain only lowercase letters, numbers, hyphens, or underscores",
  );

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters");

export const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export const createUserSchema = z
  .object({
    username: usernameSchema.optional().or(z.literal("")),
    name: nameSchema,
    role: assignableRoleEnum,
    password: passwordSchema.optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const isCustomer = data.role === "customer";
    const hasUsername = Boolean(data.username && data.username.trim().length > 0);
    const hasPassword = Boolean(data.password && data.password.trim().length > 0);

    if (isCustomer) {
      if (hasUsername && !hasPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required when a portal username is set.",
          path: ["password"],
        });
      }
      if (hasPassword && !hasUsername) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Username is required when setting a portal password.",
          path: ["username"],
        });
      }
    } else {
      // Staff roles require both username and password
      if (!hasUsername) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Username is required for staff accounts.",
          path: ["username"],
        });
      }
      if (!hasPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required for staff accounts.",
          path: ["password"],
        });
      }
    }
  });

export const updateUserSchema = z
  .object({
    id: z.number().int().positive("Invalid user ID"),
    username: usernameSchema.optional().or(z.literal("")),
    name: nameSchema,
    role: assignableRoleEnum.optional(),
    password: passwordSchema.optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const isCustomer = data.role === "customer";
    const hasUsername = Boolean(data.username && data.username.trim().length > 0);
    const hasPassword = Boolean(data.password && data.password.trim().length > 0);

    if (isCustomer) {
      if (hasPassword && !hasUsername) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Username is required when setting a portal password.",
          path: ["username"],
        });
      }
    } else if (data.role) {
      if (!hasUsername) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Username is required for staff accounts.",
          path: ["username"],
        });
      }
    }
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
