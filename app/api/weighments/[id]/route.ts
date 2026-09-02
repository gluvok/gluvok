import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  StatusCodes,
  forbiddenError,
  hasPermission,
} from "@/db/helpers";
import { WeighmentType, ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";
import { editWeighmentSchema } from "@/lib/validation";
import { formatWeighmentRecord } from "@/lib/services/weighments";

export const GET = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.READ)) return forbiddenError();
  const { id } = await ctx.params;
  const weighmentId = Number(id);

  const { data: row, error } = await client
    .from("weighments")
    .select(
      `*, in_entry:entries!in_entry_id(id, weight, images, created_at, center_id, user_id, customer_id, vehicle_number, detected_vehicle_number, source, status, auto_approved, centers(name), users(name), customers(name, user_id)), out_entry:entries!out_entry_id(id, weight, images, created_at, center_id, user_id, customer_id, vehicle_number, detected_vehicle_number, source, status, auto_approved, centers(name), users(name), customers(name, user_id))`,
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
    const inCustomer = inEntry.customers as { user_id?: number } | undefined;
    const outCustomer = outEntry.customers as { user_id?: number } | undefined;
    const isOwnCustomer = inCustomer?.user_id === userId || outCustomer?.user_id === userId;

    if (!isOwnCustomer) {
      return apiError("Weighment not found", StatusCodes.NOT_FOUND);
    }
  }

  const formatted = formatWeighmentRecord(row);

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

  const allowedKeys = ["type", "rate_id"];
  const forbiddenKeys = Object.keys(body).filter((key) => !allowedKeys.includes(key));
  if (forbiddenKeys.length > 0) {
    return apiError(
      "Only the 'type' and 'rate_id' fields can be edited on a weighment record.",
      StatusCodes.BAD_REQUEST,
    );
  }

  const updates: Record<string, unknown> = {};

  // 2. Validate 'type' update lock if type is NOT 'unassigned'
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

  // 3. Validate 'rate_id' update lock if rate_id is NOT null
  if (body.rate_id !== undefined) {
    if (existing.rate_id !== null && existing.rate_id !== undefined) {
      return apiError(
        "Rate is already set for this weighment and cannot be modified.",
        StatusCodes.BAD_REQUEST,
      );
    }
    if (body.rate_id !== null) {
      const { data: validRate } = await client
        .from("rates")
        .select("id, unit")
        .eq("id", body.rate_id)
        .eq("factory_id", user.factory_id!)
        .is("deleted_at", null)
        .maybeSingle();

      if (!validRate) {
        return apiError(
          "Rate not found or does not belong to your factory.",
          StatusCodes.BAD_REQUEST,
        );
      }
      updates["unit"] = validRate.unit;
    }
    updates["rate_id"] = body.rate_id;
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
