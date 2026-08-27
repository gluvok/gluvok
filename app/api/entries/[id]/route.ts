import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
} from "@/db/helpers";
import {
  ProjectSlug,
  PermissionKey,
  TableName,
  EntityKey,
  EntryStatus,
} from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";
import { editEntrySchema } from "@/lib/validation";

export const GET = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.READ)) return forbiddenError();
  const { id } = await ctx.params;
  const entryId = Number(id);

  const { data, error } = await client
    .from(TableName.ENTRIES)
    .select(
      `*, ${TableName.CENTERS}(${EntityKey.NAME}), ${TableName.USERS}(${EntityKey.NAME}), ${TableName.CUSTOMERS}(${EntityKey.NAME})`,
    )
    .eq(EntityKey.ID, entryId)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .is(EntityKey.DELETED_AT, null)
    .maybeSingle();

  if (error || !data) {
    return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const centers = data.centers as Record<string, unknown> | undefined;
  const users = data.users as Record<string, unknown> | undefined;
  const customers = data.customers as Record<string, unknown> | undefined;

  const formatted = {
    ...data,
    [EntityKey.CENTER_NAME]: centers?.name || "",
    [EntityKey.USER_NAME]: users?.name || "",
    [EntityKey.CUSTOMER_NAME]: customers?.name || "",
  };

  return NextResponse.json({ data: formatted });
});

export const PATCH = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.WRITE)) return forbiddenError();
  const { id } = await ctx.params;
  const entryId = Number(id);
  const body = await req.json();

  const parsed = editEntrySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
  }

  // 1. Fetch current entry
  const { data: existing, error: fetchErr } = await client
    .from(TableName.ENTRIES)
    .select("*")
    .eq(EntityKey.ID, entryId)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)
    .is(EntityKey.DELETED_AT, null)
    .maybeSingle();

  if (fetchErr || !existing) {
    return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // 2. Strict Edit Lock Matrix Verification
  if (existing.status === EntryStatus.REJECTED) {
    return apiError("Rejected entries cannot be modified or approved.", StatusCodes.FORBIDDEN);
  }

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
    if (body.weight !== undefined && Number(body.weight) !== Number(existing.weight)) {
      return apiError("Cannot modify weight on approved entries.", StatusCodes.BAD_REQUEST);
    }
    if (body.center_id !== undefined && Number(body.center_id) !== Number(existing.center_id)) {
      return apiError("Cannot modify center on approved entries.", StatusCodes.BAD_REQUEST);
    }
    if (body.images !== undefined) {
      return apiError("Cannot modify images on approved entries.", StatusCodes.BAD_REQUEST);
    }
    if (body.status !== undefined && body.status !== existing.status) {
      return apiError("Cannot modify status on approved entries.", StatusCodes.BAD_REQUEST);
    }
    if (body.customer_id !== undefined) {
      updates[EntityKey.CUSTOMER_ID] = body.customer_id ? Number(body.customer_id) : null;
    }
  } else {
    // Status is pending: vehicle_number, customer_id, images, status can be edited
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
    .is(EntityKey.DELETED_AT, null)
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

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.DELETE)) return forbiddenError();

    // Check if any active weighments are linked to this entry
    const { data: linkedWeighment } = await client
      .from(TableName.WEIGHMENTS)
      .select(EntityKey.ID)
      .or(`${EntityKey.IN_ENTRY_ID}.eq.${entityId},${EntityKey.OUT_ENTRY_ID}.eq.${entityId}`)
      .is(EntityKey.DELETED_AT, null)
      .limit(1)
      .maybeSingle();

    if (linkedWeighment) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_ENTRY(entityId), StatusCodes.BAD_REQUEST);
    }

    const query = client
      .from(TableName.ENTRIES)
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
        error.message || ApiErrorMessage.CANNOT_DELETE_ENTRY(entityId),
        StatusCodes.BAD_REQUEST,
      );
    }

    if (!data || data.length === 0) {
      return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true, id: entityId });
  }),
);
