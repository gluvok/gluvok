import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  formatEntityResponse,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactory,
} from "@/db/helpers";
import { getDynamicUserSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { PermissionKey, ProjectSlug, Role, TableName } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from(TableName.USERS)
      .select("id, username, name, aadhar_number, role, factory_id, created_at, updated_at")
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
      .from(TableName.USERS)
      .select("id, username, name, aadhar_number, role, factory_id, token_version")
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
    const factory = await getFactory(client, user.factory_id);
    const dynamicSchema = getDynamicUserSchema(factory, true);
    const parsed = dynamicSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, aadhar_number, password, role } = body;
    const validRole =
      role && Object.values(Role).includes(role as Role) ? (role as Role) : undefined;

    if (aadhar_number && aadhar_number !== existing.aadhar_number) {
      const { data: duplicateAadhar } = await client
        .from(TableName.USERS)
        .select("id")
        .eq("aadhar_number", aadhar_number)
        .eq("factory_id", factoryId)
        .neq("id", entityId)
        .is("deleted_at", null)
        .maybeSingle();

      if (duplicateAadhar) {
        return apiError(ApiErrorMessage.AADHAR_NUMBER_EXISTS, StatusCodes.BAD_REQUEST);
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name && typeof name === "string" && name.trim().length > 0) {
      updates["name"] = name.trim();
    }
    if (validRole) {
      updates["role"] = validRole;
    }
    if (aadhar_number !== undefined) {
      updates["aadhar_number"] = aadhar_number ? String(aadhar_number) : null;
    }
    if (password && typeof password === "string" && password.trim().length > 0) {
      updates.password_hash = await hashPassword(password.trim());
      updates["token_version"] = (existing.token_version || 1) + 1;
    }

    const { data: updated, error } = await client
      .from(TableName.USERS)
      .update(updates)
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null)
      .select("id, username, name, aadhar_number, role, factory_id, created_at, updated_at")
      .single();

    if (error || !updated) {
      return apiError(error?.message || ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return formatEntityResponse(updated);
  }),
);

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from(TableName.USERS)
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

    // Check if any active entries are linked to this user
    const { data: linkedEntry } = await client
      .from(TableName.ENTRIES)
      .select("id")
      .eq("user_id", entityId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (linkedEntry) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_USER(entityId), StatusCodes.BAD_REQUEST);
    }

    // Check if any active customers are linked to this user
    const { data: linkedCustomer } = await client
      .from(TableName.CUSTOMERS)
      .select("id")
      .eq("user_id", entityId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (linkedCustomer) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_USER(entityId), StatusCodes.BAD_REQUEST);
    }

    const { error } = await client
      .from(TableName.USERS)
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
