import { NextResponse } from "next/server";
import { withAuth, apiError, StatusCodes } from "@/db/helpers";
import { TableName, EntityKey, RelationAlias, WeighmentType, Unit } from "@/lib/constants/enums";

export const GET = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  const { id } = await ctx.params;
  const weighmentId = Number(id);

  const { data: row, error } = await client
    .from(TableName.WEIGHMENTS)
    .select(
      `*, ${RelationAlias.IN_ENTRY}:${TableName.ENTRIES}!in_entry_id(*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME})), ${RelationAlias.OUT_ENTRY}:${TableName.ENTRIES}!out_entry_id(*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME}))`,
    )
    .eq(EntityKey.ID, weighmentId)
    .eq(`${RelationAlias.IN_ENTRY}.${EntityKey.FACTORY_ID}`, user.factory_id!)
    .is(EntityKey.DELETED_AT, null)
    .maybeSingle();

  if (error || !row) {
    return apiError("Weighment not found", StatusCodes.NOT_FOUND);
  }

  const inEntry = (row[RelationAlias.IN_ENTRY] as Record<string, unknown>) || {};
  const outEntry = (row[RelationAlias.OUT_ENTRY] as Record<string, unknown>) || {};
  const inWeight = Number(inEntry.weight || 0);
  const outWeight = Number(outEntry.weight || 0);
  const grossWeight = Math.max(inWeight, outWeight);
  const tareWeight = Math.min(inWeight, outWeight);
  const netWeight = grossWeight - tareWeight;

  const inImages = Array.isArray(inEntry.images) ? (inEntry.images as string[]) : [];
  const outImages = Array.isArray(outEntry.images) ? (outEntry.images as string[]) : [];
  const combinedImages = Array.from(new Set([...inImages, ...outImages]));

  const inCenters = inEntry.centers as Record<string, unknown> | undefined;
  const outCenters = outEntry.centers as Record<string, unknown> | undefined;
  const inUsers = inEntry.users as Record<string, unknown> | undefined;
  const outUsers = outEntry.users as Record<string, unknown> | undefined;
  const inCustomers = inEntry.customers as Record<string, unknown> | undefined;
  const outCustomers = outEntry.customers as Record<string, unknown> | undefined;

  const formatted = {
    [EntityKey.ID]: row.id,
    [EntityKey.UNIT]: row.unit || Unit.KG,
    [EntityKey.TYPE]: row.type || WeighmentType.UNASSIGNED,
    [EntityKey.GROSS_WEIGHT]: grossWeight,
    [EntityKey.TARE_WEIGHT]: tareWeight,
    [EntityKey.NET_WEIGHT]: netWeight,
    [EntityKey.IMAGES]: combinedImages,
    [EntityKey.IN_ENTRY_ID]: row.in_entry_id,
    [EntityKey.IN_ENTRY_CREATED_AT]: inEntry.created_at,
    [EntityKey.OUT_ENTRY_ID]: row.out_entry_id,
    [EntityKey.OUT_ENTRY_CREATED_AT]: outEntry.created_at,
    [EntityKey.IN_CENTER_ID]: inEntry.center_id,
    [EntityKey.IN_CENTER_NAME]: inCenters?.name || "",
    [EntityKey.OUT_CENTER_ID]: outEntry.center_id,
    [EntityKey.OUT_CENTER_NAME]: outCenters?.name || "",
    [EntityKey.IN_USER_ID]: inEntry.user_id,
    [EntityKey.IN_USER_NAME]: inUsers?.name || "",
    [EntityKey.OUT_USER_ID]: outEntry.user_id,
    [EntityKey.OUT_USER_NAME]: outUsers?.name || "",
    [EntityKey.IN_CUSTOMER_ID]: inEntry.customer_id,
    [EntityKey.IN_CUSTOMER_NAME]: inCustomers?.name || "",
    [EntityKey.OUT_CUSTOMER_ID]: outEntry.customer_id,
    [EntityKey.OUT_CUSTOMER_NAME]: outCustomers?.name || "",
    [EntityKey.VEHICLE_NUMBER]:
      (inEntry.vehicle_number as string) || (outEntry.vehicle_number as string) || "",
    [EntityKey.RATE_ID]: row.rate_id,
    [EntityKey.CREATED_AT]: row.created_at,
    [EntityKey.UPDATED_AT]: row.updated_at,
  };

  return NextResponse.json({ data: formatted });
});

export const PATCH = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  const { id } = await ctx.params;
  const weighmentId = Number(id);
  const body = await req.json();

  // 1. Fetch existing weighment
  const { data: existing, error: fetchErr } = await client
    .from(TableName.WEIGHMENTS)
    .select(`${EntityKey.ID}, ${EntityKey.RATE_ID}, ${EntityKey.TYPE}`)
    .eq(EntityKey.ID, weighmentId)
    .is(EntityKey.DELETED_AT, null)
    .maybeSingle();

  if (fetchErr || !existing) {
    return apiError("Weighment not found", StatusCodes.NOT_FOUND);
  }

  const allowedKeys = [EntityKey.TYPE];
  const forbiddenKeys = Object.keys(body).filter((key) => !allowedKeys.includes(key as EntityKey));
  if (forbiddenKeys.length > 0) {
    return apiError(
      "Only the 'type' field can be edited on a weighment record.",
      StatusCodes.BAD_REQUEST,
    );
  }

  const updates: Record<string, unknown> = {};

  // 3. Validate 'type' update lock if type is NOT 'unassigned'
  if (body.type !== undefined) {
    if (
      existing.type !== WeighmentType.UNASSIGNED &&
      existing.type !== null &&
      existing.type !== undefined
    ) {
      return apiError(
        "Weighment type is already set and cannot be modified further.",
        StatusCodes.BAD_REQUEST,
      );
    }
    updates[EntityKey.TYPE] = body.type;
  }

  if (Object.keys(updates).length === 0) {
    return apiError("No valid fields provided for update.", StatusCodes.BAD_REQUEST);
  }

  updates[EntityKey.UPDATED_AT] = new Date().toISOString();

  const { data: updated, error } = await client
    .from(TableName.WEIGHMENTS)
    .update(updates)
    .eq(EntityKey.ID, weighmentId)
    .is(EntityKey.DELETED_AT, null)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("Failed to update weighment:", error);
    return apiError("Failed to update weighment record.", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return NextResponse.json({ data: updated });
});
