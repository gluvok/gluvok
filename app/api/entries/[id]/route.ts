import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey, EntryStatus, EntryType, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";
import {
  validateCenterBelongsToFactory,
  validateCustomerBelongsToFactory,
} from "@/lib/services/entries";
import { editEntrySchema } from "@/lib/validation";

export const GET = withAuth<{ id: string }>(async (req, user, client, ctx) => {
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

  const centers = data.centers as Record<string, unknown> | undefined;
  const users = data.users as Record<string, unknown> | undefined;
  const customers = data.customers as Record<string, unknown> | undefined;

  const formatted = {
    ...data,
    center_name: centers?.name || "",
    user_name: users?.name || "",
    customer_name: customers?.name || "",
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
    .eq("factory_id", user.factory_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !existing) {
    return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // 2. Strict Edit Lock Matrix Verification
  if (existing.status === EntryStatus.REJECTED) {
    return apiError(ApiErrorMessage.ENTRY_REJECTED_LOCKED, StatusCodes.FORBIDDEN);
  }

  const isApproved = existing.status === EntryStatus.APPROVED || existing.auto_approved === true;
  const isAutoApproved = existing.auto_approved === true;
  const isEdited = existing.edited === true;
  const hasCustomer = existing.customer_id !== null && existing.customer_id !== undefined;

  // Fully locked if:
  // - Approved (not auto-approved) AND already has customer
  // - Auto-approved AND already edited AND already has customer
  if (isApproved && hasCustomer && (!isAutoApproved || isEdited)) {
    return apiError(ApiErrorMessage.ENTRY_FULLY_LOCKED, StatusCodes.FORBIDDEN);
  }

  const updates: Record<string, unknown> = {};

  if (isApproved) {
    // 1. Vehicle number check: ONLY auto-approved entries that have NOT been edited can correct vehicle_number
    if (body.vehicle_number !== undefined && body.vehicle_number !== existing.vehicle_number) {
      if (!isAutoApproved) {
        return apiError(
          ApiErrorMessage.CANNOT_MODIFY_MANUALLY_APPROVED_VEHICLE,
          StatusCodes.BAD_REQUEST,
        );
      }
      if (isEdited) {
        return apiError(ApiErrorMessage.VEHICLE_ALREADY_EDITED_LOCKED, StatusCodes.BAD_REQUEST);
      }
      updates["vehicle_number"] = body.vehicle_number;
      updates["edited"] = true;
    }

    // 2. Customer ID check: only if customer is currently null
    if (body.customer_id !== undefined && body.customer_id !== existing.customer_id) {
      if (hasCustomer) {
        return apiError(ApiErrorMessage.ENTRY_APPROVED_CUSTOMER_LOCKED, StatusCodes.BAD_REQUEST);
      }
      if (body.customer_id) {
        await validateCustomerBelongsToFactory(client, Number(body.customer_id), user.factory_id);
      }
      updates["customer_id"] = body.customer_id ? Number(body.customer_id) : null;
    }

    // 3. Locked fields check (weight, center_id, images, status cannot be modified on approved)
    const lockedFields = ["weight", "center_id", "images", "status"] as const;
    for (const field of lockedFields) {
      if (body[field] !== undefined && body[field] !== existing[field]) {
        return apiError(
          ApiErrorMessage.CANNOT_MODIFY_APPROVED_ENTRY(field === "center_id" ? "center" : field),
          StatusCodes.BAD_REQUEST,
        );
      }
    }
  } else if (existing.status === EntryStatus.PENDING) {
    if (existing.type === EntryType.MANUAL) {
      // Manual Pending: allow vehicle_number, weight, center_id, customer_id, images, status
      if (body.vehicle_number !== undefined) updates["vehicle_number"] = body.vehicle_number;
      if (body.weight !== undefined) updates["weight"] = Number(body.weight);
      if (body.images !== undefined) updates["images"] = body.images;
      if (body.status !== undefined) updates["status"] = body.status;

      if (body.center_id !== undefined) {
        await validateCenterBelongsToFactory(client, Number(body.center_id), user.factory_id);
        updates["center_id"] = Number(body.center_id);
      }
      if (body.customer_id !== undefined) {
        if (body.customer_id) {
          await validateCustomerBelongsToFactory(client, Number(body.customer_id), user.factory_id);
        }
        updates["customer_id"] = body.customer_id ? Number(body.customer_id) : null;
      }
    } else {
      // Automatic Pending (not auto-approved): allow vehicle_number, status
      const lockedAutoFields = ["weight", "center_id", "images", "customer_id"] as const;
      for (const field of lockedAutoFields) {
        if (body[field] !== undefined && body[field] !== existing[field]) {
          return apiError(
            `Cannot modify ${field === "center_id" ? "center" : field} on an automatic entry.`,
            StatusCodes.BAD_REQUEST,
          );
        }
      }
      if (body.vehicle_number !== undefined) updates["vehicle_number"] = body.vehicle_number;
      if (body.status !== undefined) updates["status"] = body.status;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: existing });
  }

  const newStatus = (updates["status"] as string) || existing.status;
  const targetVehicle = (updates["vehicle_number"] as string) || existing.vehicle_number;

  // 3. Sequential Approval Validation if transitioning to approved or changing vehicle plate on approved
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

  // 4. Perform update
  const { data: updatedEntry, error: updateErr } = await client
    .from("entries")
    .update(updates)
    .eq("id", entryId)
    .eq("factory_id", user.factory_id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (updateErr || !updatedEntry) {
    console.error("Failed to update entry:", updateErr);
    return apiError(ApiErrorMessage.FAILED_TO_UPDATE_ENTRY, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 5. Trigger entry merging if status is approved
  if (updatedEntry.status === EntryStatus.APPROVED) {
    await tryMergeEntries(client, user.factory_id, entryId);
  }

  return NextResponse.json({ data: updatedEntry });
});

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.DELETE)) return forbiddenError();

    // Check if any active weighments are linked to this entry
    const { data: linkedWeighment } = await client
      .from("weighments")
      .select("id")
      .or(`in_entry_id.eq.${entityId},out_entry_id.eq.${entityId}`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (linkedWeighment) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_ENTRY(entityId), StatusCodes.BAD_REQUEST);
    }

    const query = client
      .from("entries")
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
