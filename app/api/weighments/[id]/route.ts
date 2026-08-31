import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  StatusCodes,
  forbiddenError,
  hasPermission,
  getBaseUserCustomerIds,
} from "@/db/helpers";
import { WeighmentType, Unit, ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";
import { editWeighmentSchema } from "@/lib/validation";

export const GET = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.READ)) return forbiddenError();
  const { id } = await ctx.params;
  const weighmentId = Number(id);

  const { data: row, error } = await client
    .from("weighments")
    .select(
      `*, in_entry:entries!in_entry_id(*, centers(name), users(name), customers(name)), out_entry:entries!out_entry_id(*, centers(name), users(name), customers(name))`,
    )
    .eq("id", weighmentId)
    .eq("in_entry.factory_id", user.factory_id!)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !row) {
    return apiError("Weighment not found", StatusCodes.NOT_FOUND);
  }

  const inEntry = (row["in_entry"] as Record<string, unknown>) || {};
  const outEntry = (row["out_entry"] as Record<string, unknown>) || {};

  if (user.role === Role.BASE) {
    const userId = parseInt(user.sub, 10);
    const customerIds = await getBaseUserCustomerIds(client, userId);
    const isOwn =
      inEntry.user_id === userId ||
      outEntry.user_id === userId ||
      (inEntry.customer_id !== null &&
        inEntry.customer_id !== undefined &&
        customerIds.includes(Number(inEntry.customer_id))) ||
      (outEntry.customer_id !== null &&
        outEntry.customer_id !== undefined &&
        customerIds.includes(Number(outEntry.customer_id)));

    if (!isOwn) {
      return apiError("Weighment not found", StatusCodes.NOT_FOUND);
    }
  }
  const inWeight = Number(inEntry.weight);
  const outWeight = Number(outEntry.weight);
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
    id: row.id,
    unit: row.unit || Unit.KG,
    type: row.type || WeighmentType.UNASSIGNED,
    gross_weight: grossWeight,
    tare_weight: tareWeight,
    net_weight: netWeight,
    images: combinedImages,
    in_entry_id: row.in_entry_id,
    in_entry_created_at: inEntry.created_at,
    out_entry_id: row.out_entry_id,
    out_entry_created_at: outEntry.created_at,
    in_center_id: inEntry.center_id,
    in_center_name: inCenters?.name || "",
    out_center_id: outEntry.center_id,
    out_center_name: outCenters?.name || "",
    in_user_id: inEntry.user_id,
    in_user_name: inUsers?.name || "",
    out_user_id: outEntry.user_id,
    out_user_name: outUsers?.name || "",
    in_customer_id: inEntry.customer_id,
    in_customer_name: inCustomers?.name || "",
    out_customer_id: outEntry.customer_id,
    out_customer_name: outCustomers?.name || "",
    vehicle_number: (inEntry.vehicle_number as string) || (outEntry.vehicle_number as string) || "",
    rate_id: row.rate_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  return NextResponse.json({ data: formatted });
});

export const PATCH = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.WRITE)) return forbiddenError();
  const { id } = await ctx.params;
  const weighmentId = Number(id);
  const body = await req.json();

  const parsed = editWeighmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
  }

  // 1. Fetch existing weighment
  const { data: existing, error: fetchErr } = await client
    .from("weighments")
    .select("id, rate_id, type")
    .eq("id", weighmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !existing) {
    return apiError("Weighment not found", StatusCodes.NOT_FOUND);
  }

  const allowedKeys = ["type"];
  const forbiddenKeys = Object.keys(body).filter((key) => !allowedKeys.includes(key));
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
    updates["type"] = body.type;
  }

  if (Object.keys(updates).length === 0) {
    return apiError("No valid fields provided for update.", StatusCodes.BAD_REQUEST);
  }

  updates["updated_at"] = new Date().toISOString();

  const { data: updated, error } = await client
    .from("weighments")
    .update(updates)
    .eq("id", weighmentId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("Failed to update weighment:", error);
    return apiError("Failed to update weighment record.", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return NextResponse.json({ data: updated });
});

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE)) return forbiddenError();

    // 1. Fetch weighment with factory verification
    const { data: weighment, error: fetchErr } = await client
      .from("weighments")
      .select(`*, in_entry:entries!in_entry_id(factory_id)`)
      .eq("id", entityId)
      .eq("in_entry.factory_id", factoryId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchErr || !weighment) {
      return apiError("Weighment not found", StatusCodes.NOT_FOUND);
    }

    const now = new Date().toISOString();

    // 2. Soft delete the weighment
    const { error: deleteErr } = await client
      .from("weighments")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", entityId)
      .is("deleted_at", null);

    if (deleteErr) {
      console.error("Failed to soft delete weighment:", deleteErr);
      return apiError("Failed to delete weighment", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    // 3. Cascade soft delete to corresponding in_entry and out_entry
    const entryIds = [weighment.in_entry_id, weighment.out_entry_id].filter(
      (id): id is number => id !== null && id !== undefined && Number(id) > 0,
    );

    if (entryIds.length > 0) {
      const { error: cascadeErr } = await client
        .from("entries")
        .update({
          deleted_at: now,
          updated_at: now,
        })
        .in("id", entryIds)
        .eq("factory_id", factoryId)
        .is("deleted_at", null);

      if (cascadeErr) {
        console.error("Failed to cascade soft delete to linked entries:", cascadeErr);
      }
    }

    return NextResponse.json({ success: true, id: entityId });
  }),
);
