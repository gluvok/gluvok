/**
 * @file app/api/device/entries/route.ts
 * @description Dedicated API route for microcontroller/hardware automatic entry ingestion.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiError, StatusCodes, getAuthUser, validateDeviceSecret } from "@/db/helpers";
import { TableName, EntityKey, EntryStatus, EntryType } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";

export async function POST(req: NextRequest) {
  try {
    if (!validateDeviceSecret(req)) {
      return apiError(ApiErrorMessage.INVALID_DEVICE_SECRET, StatusCodes.FORBIDDEN);
    }

    const authResult = await getAuthUser(req);
    const authUser = authResult?.user;
    if (!authUser) {
      return apiError("Unauthorized", StatusCodes.UNAUTHORIZED);
    }

    const body = await req.json();
    const {
      detected_vehicle_number,
      vehicle_number,
      weight,
      center_id,
      user_id,
      customer_id,
      status = EntryStatus.PENDING,
      images = [],
    } = body;

    const operatorUserId = user_id ? Number(user_id) : parseInt(authUser.sub, 10);

    if (
      !detected_vehicle_number ||
      !vehicle_number ||
      weight === undefined ||
      !center_id ||
      !operatorUserId
    ) {
      return apiError("Missing required entry fields.", StatusCodes.BAD_REQUEST);
    }

    const factoryId = authUser.factory_id;

    // Verify center exists and belongs to factory
    const { data: centerRecord } = await db
      .from(TableName.CENTERS)
      .select(EntityKey.ID)
      .eq(EntityKey.ID, Number(center_id))
      .eq(EntityKey.FACTORY_ID, factoryId)
      .is(EntityKey.DELETED_AT, null)
      .maybeSingle();

    if (!centerRecord) {
      return apiError(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND, StatusCodes.BAD_REQUEST);
    }

    // Verify operator user exists and belongs to factory
    const { data: userRecord } = await db
      .from(TableName.USERS)
      .select(EntityKey.ID)
      .eq(EntityKey.ID, operatorUserId)
      .eq(EntityKey.FACTORY_ID, factoryId)
      .is(EntityKey.DELETED_AT, null)
      .maybeSingle();

    if (!userRecord) {
      return apiError(ApiErrorMessage.USER_NOT_FOUND, StatusCodes.BAD_REQUEST);
    }

    // Verify customer exists and belongs to factory (if provided)
    if (customer_id) {
      const { data: customerRecord } = await db
        .from(TableName.CUSTOMERS)
        .select(EntityKey.ID)
        .eq(EntityKey.ID, Number(customer_id))
        .eq(EntityKey.FACTORY_ID, factoryId)
        .is(EntityKey.DELETED_AT, null)
        .maybeSingle();

      if (!customerRecord) {
        return apiError(ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.BAD_REQUEST);
      }
    }

    const nowStr = new Date().toISOString();

    if (status === EntryStatus.APPROVED) {
      await validateSequentialApproval(
        db,
        factoryId,
        vehicle_number,
        nowStr,
        0,
        EntryType.AUTOMATIC,
      );
    }

    const { data: newEntry, error: insertErr } = await db
      .from(TableName.ENTRIES)
      .insert({
        [EntityKey.DETECTED_VEHICLE_NUMBER]: detected_vehicle_number,
        [EntityKey.VEHICLE_NUMBER]: vehicle_number,
        [EntityKey.WEIGHT]: Number(weight),
        [EntityKey.TYPE]: EntryType.AUTOMATIC,
        [EntityKey.CENTER_ID]: Number(center_id),
        [EntityKey.USER_ID]: operatorUserId,
        [EntityKey.CUSTOMER_ID]: customer_id ? Number(customer_id) : null,
        [EntityKey.FACTORY_ID]: factoryId,
        [EntityKey.STATUS]: status,
        [EntityKey.IMAGES]: images,
        [EntityKey.CREATED_AT]: nowStr,
        [EntityKey.UPDATED_AT]: nowStr,
      })
      .select("*")
      .single();

    if (insertErr || !newEntry) {
      console.error("Failed to insert automatic device entry:", insertErr);
      return apiError("Failed to create entry.", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (status === EntryStatus.APPROVED) {
      await tryMergeEntries(db, factoryId, newEntry.id);
    }

    return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process device entry creation.";
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
}
