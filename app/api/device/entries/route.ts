/**
 * @file app/api/device/entries/route.ts
 * @description Dedicated API route for microcontroller/hardware automatic entry ingestion.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiError, StatusCodes, getAuthUser, validateDeviceSecret } from "@/db/helpers";
import { EntryType } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { createEntry } from "@/lib/services/entries";
import { addDeviceEntrySchema } from "@/lib/validation";

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
    const parsed = addDeviceEntrySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const {
      detected_vehicle_number,
      vehicle_number,
      weight,
      center_id,
      status,
      images,
    } = parsed.data;

    const factoryId = authUser.factory_id;
    const operatorUserId = parseInt(authUser.sub, 10);

    const newEntry = await createEntry(db, {
      factoryId,
      userId: operatorUserId,
      type: EntryType.AUTOMATIC,
      detectedVehicleNumber: detected_vehicle_number,
      vehicleNumber: vehicle_number,
      weight,
      centerId: center_id,
      status,
      images,
    });

    return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ApiErrorMessage.PROCESS_DEVICE_ENTRY_FAILED;
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
}
