/**
 * @file lib/services/entries.ts
 * @description Service helpers for entry creation, validation, and processing.
 */

import { supabase } from "@/db";
import { EntryStatus, EntrySource } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { uploadBase64ImagesToStorage } from "./storage";
import { validateSequentialApproval, tryMergeEntries } from "./weighments";

export interface CreateEntryParams {
  factoryId: number;
  userId: number;
  vehicleNumber: string;
  weight: number;
  centerId: number;
  source?: EntrySource;
  detectedVehicleNumber?: string | null;
  customerId?: number | null;
  status?: EntryStatus;
  images?: string[];
}

export async function validateCenterBelongsToFactory(
  client: typeof supabase,
  centerId: number,
  factoryId: number,
): Promise<{ id: number; auto_approve: boolean }> {
  const { data: centerRecord } = await client
    .from("centers")
    .select("id, auto_approve")
    .eq("id", centerId)
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!centerRecord) {
    throw new Error(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND);
  }

  return {
    id: centerRecord.id,
    auto_approve: Boolean(centerRecord.auto_approve),
  };
}

export async function validateCustomerBelongsToFactory(
  client: typeof supabase,
  customerId: number,
  factoryId: number,
): Promise<void> {
  const { data: customerRecord } = await client
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!customerRecord) {
    throw new Error(ApiErrorMessage.CUSTOMER_NOT_FOUND);
  }
}

export async function createEntry(client: typeof supabase, params: CreateEntryParams) {
  const {
    factoryId,
    userId,
    vehicleNumber,
    weight,
    centerId,
    source = EntrySource.MANUAL,
    detectedVehicleNumber = null,
    customerId = null,
    status = EntryStatus.PENDING,
    images = [],
  } = params;

  // 1. Verify center exists, belongs to active factory, and check auto_approve
  const centerRecord = await validateCenterBelongsToFactory(client, Number(centerId), factoryId);

  // 2. Verify customer exists (if provided) and belongs to the active factory
  if (customerId) {
    await validateCustomerBelongsToFactory(client, Number(customerId), factoryId);
  }

  // 3. Determine auto_approved flag & final approval status
  let finalStatus = status;
  let isAutoApproved = false;

  if (source === EntrySource.DEVICE) {
    if (centerRecord.auto_approve) {
      isAutoApproved = true;
      finalStatus = EntryStatus.APPROVED;
    }
  } else {
    // Manual entries are NEVER auto-approved
    isAutoApproved = false;
  }

  const nowStr = new Date().toISOString();

  // 4. Upload base64 images to storage
  const uploadedImageUrls = await uploadBase64ImagesToStorage(images, factoryId);

  // 5. Validate sequential approval if approved
  if (finalStatus === EntryStatus.APPROVED) {
    await validateSequentialApproval(client, Number(centerId), vehicleNumber, nowStr, 0, source);
  }

  // 6. Insert new entry into database
  const { data: newEntry, error: insertErr } = await client
    .from("entries")
    .insert({
      detected_vehicle_number: detectedVehicleNumber,
      vehicle_number: vehicleNumber,
      weight: Number(weight),
      source,
      center_id: Number(centerId),
      user_id: userId,
      customer_id: customerId ? Number(customerId) : null,
      factory_id: factoryId,
      status: finalStatus,
      auto_approved: isAutoApproved,
      images: uploadedImageUrls,
      created_at: nowStr,
      updated_at: nowStr,
    })
    .select("*")
    .single();

  if (insertErr || !newEntry) {
    console.error("Failed to insert entry:", insertErr);
    throw new Error(ApiErrorMessage.CREATE_ENTRY_FAILED);
  }

  // 7. Attempt automatic weighment merging if approved
  if (newEntry.status === EntryStatus.APPROVED) {
    await tryMergeEntries(client, factoryId, newEntry.id);
  }

  return newEntry;
}
