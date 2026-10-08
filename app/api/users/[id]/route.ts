import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  formatEntityResponse,
  forbiddenError,
  hasPermission,
  StatusCodes,
} from "@/db/helpers";
import { editUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { deleteAllUserSessions, invalidateUserSessionsInCache } from "@/lib/auth/session";
import { canDeleteUserRole } from "@/lib/store";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from("users")
      .select("id, username, name, role, factory_id, created_at, updated_at")
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existing, error } = await existingQuery.maybeSingle();
    if (error || !existing || existing.role === Role.HARDWARE) {
      return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const isOwn = String(existing.id) === String(user.sub);
    if (!isOwn && !hasPermission(user, ProjectSlug.USERS, PermissionKey.READ)) {
      return forbiddenError();
    }

    return formatEntityResponse(existing);
  }),
);

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from("users")
      .select("id, username, name, role, factory_id")
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existing } = await existingQuery.maybeSingle();
    if (!existing || existing.role === Role.HARDWARE) {
      return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const isOwn = String(existing.id) === String(user.sub);

    if (!isOwn && !hasPermission(user, ProjectSlug.USERS, PermissionKey.WRITE)) {
      return forbiddenError();
    }

    const body = await req.json();
    const parsed = editUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, username, password, role } = parsed.data;
    if ((role as string) === Role.HARDWARE) {
      return apiError("Cannot assign hardware role via web API", StatusCodes.FORBIDDEN);
    }
    const validRole =
      role && Object.values(Role).includes(role as Role) ? (role as Role) : undefined;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name && typeof name === "string" && name.trim().length > 0) {
      updates["name"] = name.trim();
    }
    if (validRole) {
      updates["role"] = validRole;
    }
    const newUsername = username && typeof username === "string" ? username.trim() : null;
    const isUsernameUpdated = Boolean(newUsername && newUsername !== existing.username);
    if (isUsernameUpdated && newUsername) {
      const { data: existingUserWithUsername } = await client
        .from("users")
        .select("id")
        .eq("username", newUsername)
        .neq("id", entityId)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingUserWithUsername) {
        return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST);
      }

      updates["username"] = newUsername;
    }
    const isPasswordUpdated = Boolean(
      password && typeof password === "string" && password.trim().length > 0,
    );
    if (isPasswordUpdated) {
      updates.password_hash = await hashPassword(password!.trim());
    }
    const isRoleUpdated = Boolean(validRole && validRole !== existing.role);
    const isNameUpdated = Boolean(
      name && typeof name === "string" && name.trim() !== existing.name,
    );

    if (isPasswordUpdated || isUsernameUpdated) {
      await deleteAllUserSessions(entityId, client);
    } else if (isRoleUpdated || isNameUpdated) {
      invalidateUserSessionsInCache(entityId);
    }

    const { data: updated, error: updateErr } = await client
      .from("users")
      .update(updates)
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .select("id, username, name, role, factory_id, created_at, updated_at")
      .single();

    if (updateErr || !updated) {
      if ((updateErr as { code?: string })?.code === "23505") {
        return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST);
      }
      return apiError(ApiErrorMessage.FAILED_TO_UPDATE_USER, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (isOwn && isPasswordUpdated) {
      const response = formatEntityResponse(updated, StatusCodes.OK, {
        is_self_password_changed: true,
      });
      clearAuthCookies(response);
      return response;
    }

    return formatEntityResponse(updated, StatusCodes.OK);
  }),
);

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.USERS, PermissionKey.DELETE)) return forbiddenError();

    const existingQuery = client
      .from("users")
      .select("id, role")
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existing } = await existingQuery.maybeSingle();
    if (!existing || existing.role === Role.HARDWARE) {
      return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const isOwn = String(existing.id) === String(user.sub);

    // No one can delete themselves or a user outside their deletable-role hierarchy
    if (isOwn || !canDeleteUserRole(user.role as Role, existing.role as Role)) {
      return forbiddenError();
    }

    // Check if any active entries or customers are linked to this user (parallel)
    const [linkedEntryResult, linkedCustomerResult] = await Promise.all([
      client
        .from("entries")
        .select("id")
        .or(`created_by.eq.${entityId},approved_by.eq.${entityId}`)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle(),
      client
        .from("customers")
        .select("id")
        .eq("user_id", entityId)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle(),
    ]);

    if (linkedEntryResult.data) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_USER(entityId), StatusCodes.BAD_REQUEST);
    }

    if (linkedCustomerResult.data) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_USER(entityId), StatusCodes.BAD_REQUEST);
    }

    const { error } = await client
      .from("users")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .is("deleted_at", null)
      .eq("factory_id", factoryId);

    if (error) {
      return apiError(
        error.message || ApiErrorMessage.CANNOT_DELETE_USER(entityId),
        StatusCodes.BAD_REQUEST,
      );
    }

    await deleteAllUserSessions(entityId, client);

    return NextResponse.json({ success: true, id: entityId });
  }),
);
