import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey, EntryStatus } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";
import { editEntrySchema } from "@/lib/validation";

export const GET = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.READ)) return forbiddenError();
  const { id } = await ctx.params;
  const entryId = Number(id);

  const { data, error } = await client
    .from("entries")
    .select(`*, centers(name), users(name), customers(name)`)
    .eq("id", entryId)
    .eq("factory_id", user.factory_id!)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return apiError(ApiErrorMessage.ENTRY_NOT_FOUND, StatusCodes.NOT_FOUND);
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

  if (existing.status === EntryStatus.APPROVED && existing.customer_id !== null) {
    return apiError(ApiErrorMessage.ENTRY_APPROVED_CUSTOMER_LOCKED, StatusCodes.FORBIDDEN);
  }

  const updates: Record<string, unknown> = {};

  if (existing.status === EntryStatus.APPROVED && existing.customer_id === null) {
    // ONLY customer_id can be updated on approved entries without customer
    const lockedFields = ["vehicle_number", "weight", "center_id", "images", "status"] as const;

    for (const field of lockedFields) {
      if (body[field] !== undefined && body[field] !== existing[field]) {
        return apiError(
          ApiErrorMessage.CANNOT_MODIFY_APPROVED_ENTRY(field === "center_id" ? "center" : field),
          StatusCodes.BAD_REQUEST,
        );
      }
    }
    if (body.customer_id !== undefined) {
      updates["customer_id"] = body.customer_id ? Number(body.customer_id) : null;
    }
  } else {
    // Status is pending: vehicle_number, customer_id, images, status can be edited
    for (const key of ["vehicle_number", "images", "status"] as const) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.customer_id !== undefined) {
      updates["customer_id"] = body.customer_id ? Number(body.customer_id) : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: existing });
  }

  const newStatus = (updates["status"] as string) || existing.status;
  const targetVehicle = (updates["vehicle_number"] as string) || existing.vehicle_number;

  // 3. Sequential Approval Validation if transitioning/staying as approved
  if (newStatus === EntryStatus.APPROVED && existing.status !== EntryStatus.APPROVED) {
    try {
      await validateSequentialApproval(
        client,
        existing.center_id,
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
