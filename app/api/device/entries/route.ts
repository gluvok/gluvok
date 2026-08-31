/**
 * @file app/api/device/entries/route.ts
 * @description Dedicated API route for hardware automatic entry ingestion using hardware user authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiError, StatusCodes, getAuthUser } from "@/db/helpers";
import { EntryType, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { createEntry } from "@/lib/services/entries";
import { addDeviceEntrySchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthUser(req);
    const authUser = authResult?.user;
    if (!authUser) {
      return apiError(ApiErrorMessage.FORBIDDEN, StatusCodes.UNAUTHORIZED);
    }

    if (![Role.HARDWARE, Role.OPERATOR, Role.ADMIN].includes(authUser.role as Role)) {
      return apiError(ApiErrorMessage.FORBIDDEN, StatusCodes.FORBIDDEN);
    }

    const body = await req.json();
    const parsed = addDeviceEntrySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { detected_vehicle_number, vehicle_number, weight, center_id, status, images } =
      parsed.data;

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
    const msg = err instanceof Error ? err.message : "Failed to process device entry";
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
}
