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
    if (error || !existing) return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);

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
      .select("id, username, name, role, factory_id, token_version")
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existing } = await existingQuery.maybeSingle();
    if (!existing) return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);

    const isOwn = String(existing.id) === String(user.sub);

    if (!isOwn && !hasPermission(user, ProjectSlug.USERS, PermissionKey.WRITE)) {
      return forbiddenError();
    }

    const body = await req.json();
    const parsed = editUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, password, role } = parsed.data;
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
    if (password && typeof password === "string" && password.trim().length > 0) {
      updates.password_hash = await hashPassword(password.trim());
      updates["token_version"] = (existing.token_version || 1) + 1;
    }

    const { data: updated, error } = await client
      .from("users")
      .update(updates)
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null)
      .select("id, username, name, role, factory_id, created_at, updated_at")
      .single();

    if (error || !updated) {
      return apiError(error?.message || ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return formatEntityResponse(updated, StatusCodes.OK);
  }),
);

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from("users")
      .select("id")
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existing } = await existingQuery.maybeSingle();
    if (!existing) return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);

    const isOwn = String(existing.id) === String(user.sub);

    if (!isOwn && !hasPermission(user, ProjectSlug.USERS, PermissionKey.DELETE)) {
      return forbiddenError();
    }

    // Check if any active entries or customers are linked to this user (parallel)
    const [linkedEntryResult, linkedCustomerResult] = await Promise.all([
      client
        .from("entries")
        .select("id")
        .eq("user_id", entityId)
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

    const response = NextResponse.json({ success: true, id: entityId, is_self_deleted: isOwn });
    if (isOwn) {
      clearAuthCookies(response);
    }

    return response;
  }),
);
