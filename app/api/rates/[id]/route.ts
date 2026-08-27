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
import { editRateSchema } from "@/lib/validation";

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.READ)) return forbiddenError();

    const query = client
      .from(TableName.RATES)
      .select(`*, ${TableName.COMMODITIES}!left(${EntityKey.NAME})`)
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId)
      .is(EntityKey.DELETED_AT, null);

    const { data: rate, error } = await query.maybeSingle();
    if (error || !rate) return apiError(ApiErrorMessage.RATE_NOT_FOUND, StatusCodes.NOT_FOUND);

    const commodities = rate.commodities as Record<string, unknown> | undefined;
    const formatted = {
      ...rate,
      [EntityKey.COMMODITY_NAME]: commodities?.name || "",
    };

    return formatEntityResponse(formatted);
  }),
);

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.WRITE)) return forbiddenError();

    // Check if this rate is associated with any active weighment
    const { data: linkedWeighments } = await client
      .from(TableName.WEIGHMENTS)
      .select(EntityKey.ID)
      .eq(EntityKey.RATE_ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .limit(1);

    if (linkedWeighments && linkedWeighments.length > 0) {
      return apiError(
        "This rate is associated with weighment record(s) and cannot be edited.",
        StatusCodes.FORBIDDEN,
      );
    }

    const body = await req.json();
    const parsed = editRateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { unit_price, unit, commodity_id } = parsed.data;

    const query = client
      .from(TableName.RATES)
      .update({
        ...(unit_price ? { [EntityKey.UNIT_PRICE]: String(unit_price) } : {}),
        ...(unit ? { [EntityKey.UNIT]: unit } : {}),
        ...(commodity_id ? { [EntityKey.COMMODITY_ID]: Number(commodity_id) } : {}),
        [EntityKey.UPDATED_AT]: new Date().toISOString(),
      })
      .eq(EntityKey.ID, entityId)
      .eq(EntityKey.FACTORY_ID, factoryId)
      .is(EntityKey.DELETED_AT, null);

    const { data: updated, error } = await query.select().maybeSingle();
    if (error || !updated) return apiError(ApiErrorMessage.RATE_NOT_FOUND, StatusCodes.NOT_FOUND);

    return formatEntityResponse(updated);
  }),
);

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.DELETE)) return forbiddenError();

    // Check if any active weighments are linked to this rate
    const { data: linkedWeighment } = await client
      .from(TableName.WEIGHMENTS)
      .select(EntityKey.ID)
      .eq(EntityKey.RATE_ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .limit(1)
      .maybeSingle();

    if (linkedWeighment) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_RATE(entityId), StatusCodes.BAD_REQUEST);
    }

    const query = client
      .from(TableName.RATES)
      .update({
        [EntityKey.DELETED_AT]: new Date().toISOString(),
        [EntityKey.UPDATED_AT]: new Date().toISOString(),
      })
      .eq(EntityKey.ID, entityId)
      .is(EntityKey.DELETED_AT, null)
      .eq(EntityKey.FACTORY_ID, factoryId);

    const { data, error } = await query.select(EntityKey.ID);
    if (error) {
      return apiError(
        error.message || ApiErrorMessage.CANNOT_DELETE_RATE(entityId),
        StatusCodes.BAD_REQUEST,
      );
    }

    if (!data || data.length === 0) {
      return apiError(ApiErrorMessage.RATE_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true, id: entityId });
  }),
);
