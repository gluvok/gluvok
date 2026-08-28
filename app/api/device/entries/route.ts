/**
 * @file app/api/device/entries/route.ts
 * @description Dedicated API route for microcontroller/hardware automatic entry ingestion.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiError, StatusCodes, getAuthUser, validateDeviceSecret } from "@/db/helpers";
import { TableName, EntryStatus, EntryType } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { uploadBase64ImagesToStorage } from "@/lib/services/storage";

export async function POST(req: NextRequest) {
  try {
    if (!validateDeviceSecret(req)) {
      return apiError(ApiErrorMessage.INVALID_DEVICE_SECRET, StatusCodes.FORBIDDEN);
    }

    const authResult = await getAuthUser(req);
    const authUser = authResult?.user;
    if (!authUser) {
      return apiError(ApiErrorMessage.UNAUTHORIZED, StatusCodes.UNAUTHORIZED);
    }

    const body = await req.json();
    const { detected_vehicle_number, vehicle_number, weight, center_id, images = [] } = body;

    if (!detected_vehicle_number || !vehicle_number || weight === undefined || !center_id) {
      return apiError(ApiErrorMessage.MISSING_REQUIRED_ENTRY_FIELDS, StatusCodes.BAD_REQUEST);
    }

    const factoryId = authUser.factory_id;
    const operatorUserId = parseInt(authUser.sub, 10);

    // Verify center exists and belongs to the active factory
    const { data: centerRecord } = await db
      .from(TableName.CENTERS)
      .select("id")
      .eq("id", Number(center_id))
      .eq("factory_id", factoryId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!centerRecord) {
      return apiError(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND, StatusCodes.BAD_REQUEST);
    }

    const nowStr = new Date().toISOString();
    const uploadedImageUrls = await uploadBase64ImagesToStorage(images, factoryId);

    const { data: newEntry, error: insertErr } = await db
      .from(TableName.ENTRIES)
      .insert({
        detected_vehicle_number,
        vehicle_number,
        weight: Number(weight),
        type: EntryType.AUTOMATIC,
        center_id: Number(center_id),
        user_id: operatorUserId,
        customer_id: null,
        factory_id: factoryId,
        status: EntryStatus.PENDING,
        images: uploadedImageUrls,
        created_at: nowStr,
        updated_at: nowStr,
      })
      .select("*")
      .single();

    if (insertErr || !newEntry) {
      console.error("Failed to insert automatic device entry:", insertErr);
      return apiError(ApiErrorMessage.CREATE_ENTRY_FAILED, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ApiErrorMessage.PROCESS_DEVICE_ENTRY_FAILED;
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
}
