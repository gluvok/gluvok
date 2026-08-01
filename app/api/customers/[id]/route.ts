import { NextResponse } from "next/server"
import { eq, and, ne } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  withEntityScope,
  apiError,
  isFKViolation,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactoryConfig,
  formatEntityResponse,
} from "@/db/helpers";
import {
  DatabasePropertyKey,
  ProjectSlug,
  PermissionKey,
  Role,
  TenantMode,
} from "@/lib/constants/enums";
import { getDynamicCustomerSchema } from "@/lib/validation"
import { hashPassword } from "@/lib/auth/password"

export const PATCH = withAuth(
  withEntityScope(
    (mode) => getTables(mode).customers,
    sharedSchema.customers.factoryId,
    async (req, user, db, mode, _ctx, { whereClause }) => {
      const { customers, users } = getTables(mode);

      // Fetch the record first to check ownership
      const [existing] = await db
        .select({ id: customers.id, userId: customers.userId, name: customers.name })
        .from(customers)
        .where(whereClause);
      const isOwn =
        existing?.userId != null &&
        String(existing.userId) === String(user.sub);

      // Self-update allowed even without write permission; otherwise check RBAC
      if (
        !isOwn &&
        !hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.WRITE)
      )
        return forbiddenError();

      const body = await req.json();
      const activeConfig = await getFactoryConfig(user.factory_id, db, mode);
      const dynamicSchema = getDynamicCustomerSchema(activeConfig, true);
      const parsed = dynamicSchema.safeParse(body);

      if (!parsed.success) {
        return apiError(
          parsed.error.issues[0].message,
          StatusCodes.BAD_REQUEST,
        );
      }

      const { name, father_name, username, password, is_active } = body;

      if (username && typeof username === "string" && username.trim().length > 0) {
        const cleanUsername = username.trim();
        const existingUserConds = [eq(sharedSchema.users.username, cleanUsername)];
        if (existing?.userId != null) {
          existingUserConds.push(ne(sharedSchema.users.id, existing.userId));
        }
        const [takenUser] = await db
          .select({ id: sharedSchema.users.id })
          .from(users)
          .where(and(...existingUserConds));
        if (takenUser) {
          return apiError("Username is already taken", StatusCodes.BAD_REQUEST);
        }
      }

      const [updated] = await db
        .update(customers)
        .set({
          ...(name ? { name } : {}),
          ...(father_name ? { fatherName: father_name } : {}),
          updatedAt: new Date(),
        })
        .where(whereClause)
        .returning();

      if (!updated)
        return apiError("Customer not found", StatusCodes.NOT_FOUND);

      if (updated.userId) {
        const userUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (name && typeof name === "string" && name.trim().length > 0) {
          userUpdates.name = name.trim();
        }
        if (username && typeof username === "string" && username.trim().length > 0) {
          userUpdates.username = username.trim();
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
        if (is_active !== undefined) {
          userUpdates.isActive = Boolean(is_active);
        }
        if (Object.keys(userUpdates).length > 1) {
          await db
            .update(users)
            .set(userUpdates)
            .where(eq(users.id, updated.userId));
        }
      } else if (
        username &&
        typeof username === "string" &&
        username.trim().length > 0 &&
        password &&
        typeof password === "string" &&
        password.trim().length > 0
      ) {
        const passwordHash = await hashPassword(password.trim());
        const userValues = {
          name: updated.name,
          username: username.trim(),
          passwordHash,
          role: Role.BASE,
          ...(mode === TenantMode.SHARED && user.factory_id
            ? { factoryId: user.factory_id }
            : {}),
        };
        const [newUser] = await db
          .insert(users as typeof sharedSchema.users)
          .values(userValues as typeof sharedSchema.users.$inferInsert)
          .returning();

        await db
          .update(customers)
          .set({ userId: newUser.id })
          .where(eq(customers.id, updated.id));

        updated.userId = newUser.id;
      }

      return formatEntityResponse(updated, mode);
    },
  ),
);

export const DELETE = withAuth(
  withEntityScope(
    (mode) => getTables(mode).customers,
    sharedSchema.customers.factoryId,
    async (_req, user, db, mode, _ctx, { whereClause }) => {
      if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE))
        return forbiddenError();
      try {
        const { customers } = getTables(mode);
        await db.delete(customers).where(whereClause);
        return NextResponse.json({ success: true });
      } catch (error) {
        if (isFKViolation(error)) {
          return apiError(
            "Cannot delete this customer because they are referenced by existing weighments. Please reassign or delete dependent weighments first.",
            StatusCodes.BAD_REQUEST,
          );
        }
        throw error;
      }
    },
  ),
);
