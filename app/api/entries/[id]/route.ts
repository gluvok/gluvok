import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey, EntryStatus, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";
import { deleteEntries } from "@/lib/services/entries";
import {
  validateAndBuildEntryUpdates,
  handleVehicleChangeSync,
} from "@/lib/services/entries/edit-rules";
import { editEntrySchema } from "@/lib/validation";

export const GET = withAuth<{ id: string }>(async (_req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.READ)) return forbiddenError();
  const { id } = await ctx.params;
  const entryId = Number(id);

  const { data, error } = await client
    .from("entries")
    .select(`*, centers(name), users(name), customers(name, user_id)`)
    .eq("id", entryId)
    .eq("factory_id", user.factory_id!)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  if (user.role === Role.BASE) {
    const userId = parseInt(user.sub, 10);
    const customer = data.customers as { user_id?: number } | undefined;
    if (customer?.user_id !== userId) {
      return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
  }

  const isApproved = data.status === EntryStatus.APPROVED || data.auto_approved === true;
  const isEdited = Boolean(
    isApproved &&
    data.detected_vehicle_number &&
    data.vehicle_number &&
    data.detected_vehicle_number !== data.vehicle_number,
  );

  const centers = data.centers as Record<string, unknown> | undefined;
  const users = data.users as Record<string, unknown> | undefined;
  const customers = data.customers as Record<string, unknown> | undefined;

  const { data: linkedWeighment } = await client
    .from("weighments")
    .select("id, in_entry_id, out_entry_id")
    .or(`in_entry_id.eq.${entryId},out_entry_id.eq.${entryId}`)
    .is("deleted_at", null)
    .maybeSingle();

  const weighmentInfo = linkedWeighment
    ? {
        id: linkedWeighment.id,
        partner_entry_id:
          linkedWeighment.in_entry_id === entryId
            ? linkedWeighment.out_entry_id
            : linkedWeighment.in_entry_id,
      }
    : null;

  const formatted = {
    ...data,
    edited: isEdited,
    center_name: centers?.name || "",
    user_name: users?.name || "",
    customer_name: customers?.name || "",
    linked_weighment: weighmentInfo,
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
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .eq("factory_id", user.factory_id!)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !existing) {
    return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // 2. Validate edit locks and compute updates
  const validation = await validateAndBuildEntryUpdates(client, existing, body, user.factory_id!);
  if (validation.error) {
    return apiError(validation.error.message, validation.error.status);
  }

  const updates = validation.updates || {};
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: existing });
  }

  const newStatus = (updates["status"] as string) || existing.status;
  const targetVehicle = (updates["vehicle_number"] as string) || existing.vehicle_number;

  // 3. Prevent approving an entry with NO_PLATE_DETECTED
  if (newStatus === EntryStatus.APPROVED && targetVehicle === "NO_PLATE_DETECTED") {
    return apiError(ApiErrorMessage.CANNOT_APPROVE_NO_PLATE, StatusCodes.BAD_REQUEST);
  }

  // 4. Sequential Approval Validation
  const isApproved = existing.status === EntryStatus.APPROVED || existing.auto_approved === true;
  const isTransitioningToApproved =
    newStatus === EntryStatus.APPROVED && existing.status !== EntryStatus.APPROVED;
  const isChangingVehicleOnApproved =
    isApproved &&
    updates["vehicle_number"] !== undefined &&
    updates["vehicle_number"] !== existing.vehicle_number;

  if (isTransitioningToApproved || isChangingVehicleOnApproved) {
    try {
      await validateSequentialApproval(
        client,
        (updates["center_id"] as number) || existing.center_id,
        targetVehicle,
        existing.created_at,
        entryId,
      );
    } catch (seqErr: unknown) {
      const msg =
        seqErr instanceof Error ? seqErr.message : ApiErrorMessage.SEQUENTIAL_APPROVAL_FAILED;
      return apiError(msg, StatusCodes.BAD_REQUEST);
    }
  }

  updates["updated_at"] = new Date().toISOString();

  // 5. Vehicle plate sync with linked weighments
  const isChangingVehicle =
    updates["vehicle_number"] !== undefined &&
    updates["vehicle_number"] !== existing.vehicle_number;
  const updateWeighmentPair = parsed.data.update_weighment_pair === true;

  let unlinkedPartnerId: number | null = null;
  if (isChangingVehicle) {
    unlinkedPartnerId = await handleVehicleChangeSync(
      client,
      user.factory_id!,
      entryId,
      updates["vehicle_number"],
      updateWeighmentPair,
    );
  }

  // 6. Perform entry update
  const { data: updatedEntry, error: updateErr } = await client
    .from("entries")
    .update(updates)
    .eq("id", entryId)
    .eq("factory_id", user.factory_id!)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (updateErr || !updatedEntry) {
    console.error("Failed to update entry:", updateErr);
    return apiError(ApiErrorMessage.FAILED_TO_UPDATE_ENTRY, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 7. Auto-merge triggers
  if (updatedEntry.status === EntryStatus.APPROVED && !updateWeighmentPair) {
    await tryMergeEntries(client, user.factory_id!, entryId);
  }
  if (unlinkedPartnerId) {
    await tryMergeEntries(client, user.factory_id!, unlinkedPartnerId);
  }

  const isApprovedUpdated =
    updatedEntry.status === EntryStatus.APPROVED || updatedEntry.auto_approved === true;
  const isEditedUpdated = Boolean(
    isApprovedUpdated &&
    updatedEntry.detected_vehicle_number &&
    updatedEntry.vehicle_number &&
    updatedEntry.detected_vehicle_number !== updatedEntry.vehicle_number,
  );

  return NextResponse.json({ data: { ...updatedEntry, edited: isEditedUpdated } });
});

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.DELETE)) return forbiddenError();

    try {
      const { deletedIds } = await deleteEntries(client, factoryId, [entityId]);

      if (deletedIds.length === 0) {
        return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
      }

      return NextResponse.json({ success: true, id: entityId });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : ApiErrorMessage.CANNOT_DELETE_ENTRY(entityId);
      return apiError(msg, StatusCodes.BAD_REQUEST);
    }
  }),
);
