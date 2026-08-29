/**
 * @file lib/services/entries.ts
 * @description Service helpers for entry creation, validation, and processing.
 */

import { supabase } from "@/db";
import { EntryStatus, EntryType } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { uploadBase64ImagesToStorage } from "./storage";
import { validateSequentialApproval, tryMergeEntries } from "./weighments";

export interface CreateEntryParams {
  factoryId: number;
  userId: number;
  vehicleNumber: string;
  weight: number;
  centerId: number;
  type?: EntryType;
  detectedVehicleNumber?: string | null;
  customerId?: number | null;
  status?: EntryStatus;
  images?: string[];
}

export async function validateCenterBelongsToFactory(
  client: typeof supabase,
  centerId: number,
  factoryId: number,
): Promise<void> {
  const { data: centerRecord } = await client
    .from("centers")
    .select("id")
    .eq("id", centerId)
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!centerRecord) {
    throw new Error(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND);
  }
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

export async function createEntry(
  client: typeof supabase,
  params: CreateEntryParams,
) {
  const {
    factoryId,
    userId,
    vehicleNumber,
    weight,
    centerId,
    type = EntryType.MANUAL,
    detectedVehicleNumber = null,
    customerId = null,
    status = EntryStatus.PENDING,
    images = [],
  } = params;

  // 1. Verify center exists and belongs to the active factory
  await validateCenterBelongsToFactory(client, Number(centerId), factoryId);

  // 2. Verify customer exists (if provided) and belongs to the active factory
  if (customerId) {
    await validateCustomerBelongsToFactory(client, Number(customerId), factoryId);
  }

  const nowStr = new Date().toISOString();

  // 3. Upload base64 images to storage
  const uploadedImageUrls = await uploadBase64ImagesToStorage(images, factoryId);

  // 4. Validate sequential approval if approved
  if (status === EntryStatus.APPROVED) {
    await validateSequentialApproval(
      client,
      Number(centerId),
      vehicleNumber,
      nowStr,
      0,
      type,
    );
  }

  // 5. Insert new entry into database
  const { data: newEntry, error: insertErr } = await client
    .from("entries")
    .insert({
      detected_vehicle_number: detectedVehicleNumber,
      vehicle_number: vehicleNumber,
      weight: Number(weight),
      type,
      center_id: Number(centerId),
      user_id: userId,
      customer_id: customerId ? Number(customerId) : null,
      factory_id: factoryId,
      status,
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

  // 6. Attempt automatic weighment merging if approved
  if (status === EntryStatus.APPROVED) {
    await tryMergeEntries(client, factoryId, newEntry.id);
  }

  return newEntry;
}
