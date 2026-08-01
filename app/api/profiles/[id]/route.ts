import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  withEntityScope,
  apiError,
  formatEntityResponse,
  forbiddenError,
  hasPermission,
  isFKViolation,
  StatusCodes,
  getFactoryConfig,
} from "@/db/helpers";
import { getDynamicProfileSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"
import {
  PermissionKey,
  DatabasePropertyKey,
  ProjectSlug,
  Role,
  TenantMode,
} from "@/lib/constants/enums";

export const PATCH = withAuth(
  withEntityScope(
    (mode) => getTables(mode).profiles,
    sharedSchema.users.factoryId,
    async (req, user, db, mode, _ctx, { whereClause: profileWhereClause }) => {
      if (!hasPermission(user, ProjectSlug.PROFILES, PermissionKey.WRITE))
        return forbiddenError();
      const { profiles, users } = getTables(mode);
      const [existing] = await db
        .select({
          id: profiles.id,
          userId: profiles.userId,
          name: users.name,
          isActive: users.isActive,
          username: users.username,
          ...(mode === TenantMode.SHARED
            ? { factoryId: sharedSchema.users.factoryId }
            : {}),
        })
        .from(profiles)
        .innerJoin(users, eq(profiles.userId, users.id))
        .where(profileWhereClause)
        .limit(1);
      if (!existing)
        return apiError("Profile not found", StatusCodes.NOT_FOUND);
      const body = await req.json();

      const activeConfig = await getFactoryConfig(user.factory_id, db, mode);
      const dynamicSchema = getDynamicProfileSchema(activeConfig, true);
      const parsed = dynamicSchema.safeParse(body);

      if (!parsed.success) {
        return apiError(
          parsed.error.issues[0].message,
          StatusCodes.BAD_REQUEST,
        );
      }

      const { name, password, role, is_active } = body;
      const validRole =
        role && Object.values(Role).includes(role as Role)
          ? (role as Role)
          : undefined;

      const [updated] = await db
        .update(profiles)
        .set({
          ...(validRole ? { role: validRole } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(profiles.id, existing.id),
            eq(profiles.userId, existing.userId),
          ),
        )
        .returning();

      if (!updated) return apiError("Profile not found", StatusCodes.NOT_FOUND);

      const userUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (name && typeof name === "string" && name.trim().length > 0) {
        userUpdates.name = name.trim();
      }
      if (
        password &&
        typeof password === "string" &&
        password.trim().length > 0
      ) {
        userUpdates[DatabasePropertyKey.PASSWORD_HASH] = await hashPassword(
          password.trim(),
        );
      }
      if (validRole) {
        userUpdates.role = validRole;
      }
      if (is_active !== undefined) {
        userUpdates.isActive = Boolean(is_active);
      }

      let updatedUserIsActive = existing.isActive;
      let updatedUserName = existing.name;
      if (Object.keys(userUpdates).length > 1) {
        const [updatedUser] = await db
          .update(users)
          .set(userUpdates)
          .where(eq(users.id, updated.userId))
          .returning({ isActive: users.isActive, name: users.name });
        updatedUserIsActive = updatedUser?.isActive ?? updatedUserIsActive;
        updatedUserName = updatedUser?.name ?? updatedUserName;
      }

      return formatEntityResponse(
        {
          ...updated,
          name: updatedUserName,
          isActive: updatedUserIsActive,
          username: existing.username,
          ...(mode === TenantMode.SHARED
            ? { factoryId: existing.factoryId }
            : {}),
        },
        mode,
      );
    },
  ),
);

export const DELETE = withAuth(
  withEntityScope(
    (mode) => getTables(mode).profiles,
    sharedSchema.users.factoryId,
    async (_req, user, db, mode, _ctx, { whereClause: profileWhereClause }) => {
      if (!hasPermission(user, ProjectSlug.PROFILES, PermissionKey.DELETE))
        return forbiddenError();
      try {
        const { profiles, users } = getTables(mode);
        const [existing] = await db
          .select({ id: profiles.id, userId: profiles.userId })
          .from(profiles)
          .innerJoin(users, eq(profiles.userId, users.id))
          .where(profileWhereClause)
          .limit(1);
        if (!existing)
          return apiError("Profile not found", StatusCodes.NOT_FOUND);
        await db
          .delete(profiles)
          .where(
            and(
              eq(profiles.id, existing.id),
              eq(profiles.userId, existing.userId),
            ),
          );
        return NextResponse.json({ success: true });
      } catch (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this profile because it is referenced by existing weighments. Please reassign or delete dependent records first.",
            StatusCodes.BAD_REQUEST,
          );
        }
        throw error;
      }
    },
  ),
);
