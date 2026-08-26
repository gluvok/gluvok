import { NextResponse } from "next/server";
import { withAuth, apiError, StatusCodes } from "@/db/helpers";
import { TableName, EntityKey, EntryStatus } from "@/lib/constants/enums";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";

export const GET = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  const { id } = await ctx.params;
  const entryId = Number(id);

  const { data, error } = await client
    .from(TableName.ENTRIES)
    .select(
      `*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME})`,
    )
    .eq(EntityKey.ID, entryId)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .maybeSingle();

  if (error || !data) {
    return apiError("Entry not found", StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ data });
});

export const PATCH = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  const { id } = await ctx.params;
  const entryId = Number(id);
  const body = await req.json();

  // 1. Fetch current entry
  const { data: existing, error: fetchErr } = await client
    .from(TableName.ENTRIES)
    .select("*")
    .eq(EntityKey.ID, entryId)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .maybeSingle();

  if (fetchErr || !existing) {
    return apiError("Entry not found", StatusCodes.NOT_FOUND);
  }

  // 2. Strict Edit Lock Matrix Verification
  if (existing.status === EntryStatus.APPROVED && existing.customer_id !== null) {
    return apiError(
      "Approved entries with an assigned customer are fully locked and cannot be edited.",
      StatusCodes.FORBIDDEN,
    );
  }

  const updates: Record<string, unknown> = {};

  if (existing.status === EntryStatus.APPROVED && existing.customer_id === null) {
    // ONLY customer_id can be updated
    if (body.vehicle_number !== undefined && body.vehicle_number !== existing.vehicle_number) {
      return apiError("Cannot modify vehicle_number on approved entries.", StatusCodes.BAD_REQUEST);
    }
    if (body.status !== undefined && body.status !== existing.status) {
      return apiError("Cannot modify status on approved entries.", StatusCodes.BAD_REQUEST);
    }
    if (body.customer_id !== undefined) {
      updates[EntityKey.CUSTOMER_ID] = body.customer_id ? Number(body.customer_id) : null;
    }
  } else {
    // Status is pending or rejected: vehicle_number, customer_id, images, status can be edited
    if (body.vehicle_number !== undefined) {
      updates[EntityKey.VEHICLE_NUMBER] = body.vehicle_number;
    }
    if (body.customer_id !== undefined) {
      updates[EntityKey.CUSTOMER_ID] = body.customer_id ? Number(body.customer_id) : null;
    }
    if (body.images !== undefined) {
      updates[EntityKey.IMAGES] = body.images;
    }
    if (body.status !== undefined) {
      updates[EntityKey.STATUS] = body.status;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: existing });
  }

  const newStatus = (updates[EntityKey.STATUS] as string) || existing.status;
  const targetVehicle = (updates[EntityKey.VEHICLE_NUMBER] as string) || existing.vehicle_number;

  // 3. Sequential Approval Validation if transitioning/staying as approved
  if (newStatus === EntryStatus.APPROVED && existing.status !== EntryStatus.APPROVED) {
    try {
      await validateSequentialApproval(
        client,
        user.factory_id!,
        targetVehicle,
        existing.created_at,
        entryId,
      );
    } catch (seqErr: unknown) {
      const msg =
        seqErr instanceof Error ? seqErr.message : "Sequential approval validation failed.";
      return apiError(msg, StatusCodes.BAD_REQUEST);
    }
  }

  updates[EntityKey.UPDATED_AT] = new Date().toISOString();

  // 4. Perform update
  const { data: updatedEntry, error: updateErr } = await client
    .from(TableName.ENTRIES)
    .update(updates)
    .eq(EntityKey.ID, entryId)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .select("*")
    .single();

  if (updateErr || !updatedEntry) {
    console.error("Failed to update entry:", updateErr);
    return apiError("Failed to update entry", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 5. Trigger entry merging if status is approved
  if (updatedEntry.status === EntryStatus.APPROVED) {
    await tryMergeEntries(client, user.factory_id!, entryId);
  }

  return NextResponse.json({ data: updatedEntry });
});
