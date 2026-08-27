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
import { PermissionKey, ProjectSlug, Role, TableName, EntityKey } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from(TableName.USERS)
      .select(
        `${EntityKey.ID}, ${EntityKey.USERNAME}, ${EntityKey.NAME}, ${EntityKey.AADHAR_NUMBER}, ${EntityKey.ROLE}, ${EntityKey.FACTORY_ID}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`,
      )
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)
      .is(EntityKey.DELETED_AT, null);

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
      .select(
        `${EntityKey.ID}, ${EntityKey.USERNAME}, ${EntityKey.NAME}, ${EntityKey.AADHAR_NUMBER}, ${EntityKey.ROLE}, ${EntityKey.FACTORY_ID}, ${EntityKey.TOKEN_VERSION}`,
      )
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)
      .is(EntityKey.DELETED_AT, null);

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
        .select(EntityKey.ID)
        .eq(EntityKey.AADHAR_NUMBER, aadhar_number)
        .eq(EntityKey.FACTORY_ID, factoryId!)
        .neq(EntityKey.ID, entityId)
        .is(EntityKey.DELETED_AT, null)
        .maybeSingle();

      if (duplicateAadhar) {
        return apiError(ApiErrorMessage.AADHAR_NUMBER_EXISTS, StatusCodes.BAD_REQUEST);
      }
    }

    const updates: Record<string, unknown> = {
      [EntityKey.UPDATED_AT]: new Date().toISOString(),
    };

    if (name && typeof name === "string" && name.trim().length > 0) {
      updates[EntityKey.NAME] = name.trim();
    }
    if (validRole) {
      updates[EntityKey.ROLE] = validRole;
    }
    if (aadhar_number !== undefined) {
      updates[EntityKey.AADHAR_NUMBER] = aadhar_number ? String(aadhar_number) : null;
    }
    if (password && typeof password === "string" && password.trim().length > 0) {
      updates.password_hash = await hashPassword(password.trim());
      updates[EntityKey.TOKEN_VERSION] = (existing.token_version || 1) + 1;
    }

    const { data: updated, error } = await client
      .from(TableName.USERS)
      .update(updates)
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)
      .is(EntityKey.DELETED_AT, null)
      .select(
        `${EntityKey.ID}, ${EntityKey.USERNAME}, ${EntityKey.NAME}, ${EntityKey.AADHAR_NUMBER}, ${EntityKey.ROLE}, ${EntityKey.FACTORY_ID}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`,
      )
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
      .select(`${EntityKey.ID}`)
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId!)
      .is(EntityKey.DELETED_AT, null);

    const { data: existing } = await existingQuery.maybeSingle();
    if (!existing) return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.NOT_FOUND);

    const isOwn = String(existing.id) === String(user.sub);

    if (!isOwn && !hasPermission(user, ProjectSlug.USERS, PermissionKey.DELETE)) {
      return forbiddenError();
    }

    // Check if any active entries are linked to this user
    const { data: linkedEntry } = await client
      .from(TableName.ENTRIES)
      .select(EntityKey.ID)
      .eq(EntityKey.USER_ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .limit(1)
      .maybeSingle();

    if (linkedEntry) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_USER, StatusCodes.BAD_REQUEST);
    }

    // Check if any active customers are linked to this user
    const { data: linkedCustomer } = await client
      .from(TableName.CUSTOMERS)
      .select(EntityKey.ID)
      .eq(EntityKey.USER_ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .limit(1)
      .maybeSingle();

    if (linkedCustomer) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_USER, StatusCodes.BAD_REQUEST);
    }

    const { error } = await client
      .from(TableName.USERS)
      .update({
        [EntityKey.DELETED_AT]: new Date().toISOString(),
        [EntityKey.UPDATED_AT]: new Date().toISOString(),
      })
      .eq(EntityKey.ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .eq(EntityKey.FACTORY_ID, factoryId!);

    if (error) {
      return apiError(error.message || ApiErrorMessage.CANNOT_DELETE_USER, StatusCodes.BAD_REQUEST);
    }

    return NextResponse.json({ success: true, id: entityId });
  }),
);
