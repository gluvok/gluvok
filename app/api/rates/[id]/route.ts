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
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { editRateSchema } from "@/lib/validation";

export const GET = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.READ)) return forbiddenError();

    const query = client
      .from("rates")
      .select(`*, commodities!left(name)`)
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: rate, error } = await query.maybeSingle();
    if (error || !rate) return apiError(ApiErrorMessage.RATE_NOT_FOUND, StatusCodes.NOT_FOUND);

    const commodities = rate.commodities as Record<string, unknown> | undefined;
    const formatted = {
      ...rate,
      commodity_name: commodities?.name || "",
    };

    return formatEntityResponse(formatted);
  }),
);

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.RATES, PermissionKey.WRITE)) return forbiddenError();

    // Check if this rate is associated with any active weighment
    const { data: linkedWeighments } = await client
      .from("weighments")
      .select("id")
      .eq("rate_id", entityId)
      .is("deleted_at", null)
      .limit(1);

    if (linkedWeighments && linkedWeighments.length > 0) {
      return apiError(ApiErrorMessage.RATE_ASSOCIATED_WITH_WEIGHMENT, StatusCodes.FORBIDDEN);
    }

    const body = await req.json();
    const parsed = editRateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { unit_price, unit, commodity_id } = parsed.data;

    const query = client
      .from("rates")
      .update({
        ...(unit_price ? { unit_price: String(unit_price) } : {}),
        ...(unit ? { unit } : {}),
        ...(commodity_id ? { commodity_id: Number(commodity_id) } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

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
      .from("weighments")
      .select("id")
      .eq("rate_id", entityId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (linkedWeighment) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_RATE(entityId), StatusCodes.BAD_REQUEST);
    }

    const query = client
      .from("rates")
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
