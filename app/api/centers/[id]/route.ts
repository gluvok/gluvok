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
import { ProjectSlug, PermissionKey, TableName } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { editCenterSchema } from "@/lib/validation";

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE)) return forbiddenError();

    const body = await req.json();
    const parsed = editCenterSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name } = parsed.data;

    const query = client
      .from(TableName.CENTERS)
      .update({
        ...(name ? { name } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .is("deleted_at", null)
      .eq("factory_id", factoryId);

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
      .select("id")
      .eq("center_id", entityId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (linkedEntry) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_CENTER(entityId), StatusCodes.BAD_REQUEST);
    }

    const query = client
      .from(TableName.CENTERS)
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .is("deleted_at", null)
      .eq("factory_id", factoryId);

    const { data, error } = await query.select("id");
    if (error) {
      return apiError(
        error.message || ApiErrorMessage.CANNOT_DELETE_CENTER(entityId),
        StatusCodes.BAD_REQUEST,
      );
    }

    if (!data || data.length === 0) {
      return apiError(ApiErrorMessage.CENTER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true, id: entityId });
  }),
);
