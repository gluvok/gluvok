import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey, TableName, EntityKey } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE)) return forbiddenError();

    const { name } = await req.json();

    const query = client
      .from(TableName.CENTERS)
      .update({
        ...(name ? { [EntityKey.NAME]: name } : {}),
        [EntityKey.UPDATED_AT]: new Date().toISOString(),
      })
      .eq(EntityKey.ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .eq(EntityKey.FACTORY_ID, factoryId!);

    const { data: updated, error } = await query.select().maybeSingle();
    if (error || !updated) return apiError(ApiErrorMessage.CENTER_NOT_FOUND, StatusCodes.NOT_FOUND);

    return formatEntityResponse(updated);
  }),
);

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.DELETE)) return forbiddenError();

    // Check if any active entries are linked to this center
    const { data: linkedEntry } = await client
      .from(TableName.ENTRIES)
      .select(EntityKey.ID)
      .eq(EntityKey.CENTER_ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .limit(1)
      .maybeSingle();

    if (linkedEntry) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_CENTER, StatusCodes.BAD_REQUEST);
    }

    const query = client
      .from(TableName.CENTERS)
      .update({
        [EntityKey.DELETED_AT]: new Date().toISOString(),
        [EntityKey.UPDATED_AT]: new Date().toISOString(),
      })
      .eq(EntityKey.ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .eq(EntityKey.FACTORY_ID, factoryId!);

    const { data, error } = await query.select(EntityKey.ID);
    if (error) {
      return apiError(
        error.message || ApiErrorMessage.CANNOT_DELETE_CENTER,
        StatusCodes.BAD_REQUEST,
      );
    }

    if (!data || data.length === 0) {
      return apiError(ApiErrorMessage.CENTER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true, id: entityId });
  }),
);
