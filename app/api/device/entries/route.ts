/**
 * @file app/api/device/entries/route.ts
 * @description Dedicated API route for microcontroller/hardware automatic entry ingestion.
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { apiError, StatusCodes, getAuthUser } from "@/db/helpers"
import {
  TableName,
  EntityKey,
  EntryStatus,
  EntryType,
} from "@/lib/constants/enums"
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments"

export async function POST(req: NextRequest) {
  try {
    const deviceSecret = req.headers.get("x-microcontroller-secret")
    const expectedSecret = process.env.MICROCONTROLLER_SECRET || "default-pi-secret-key"
    const authUser = await getAuthUser(req)

    const isValidSecret = deviceSecret && deviceSecret === expectedSecret
    const isValidToken = authUser && authUser.factory_id

    if (!isValidSecret && !isValidToken) {
      return apiError(
        "Access denied: Invalid or missing microcontroller device secret or auth token.",
        StatusCodes.FORBIDDEN
      )
    }

    const body = await req.json()
    const {
      detected_vehicle_number,
      vehicle_number,
      weight,
      center_id,
      profile_id,
      customer_id,
      status = EntryStatus.PENDING,
      images = [],
    } = body

    if (!detected_vehicle_number || !vehicle_number || weight === undefined || !center_id || !profile_id) {
      return apiError("Missing required entry fields.", StatusCodes.BAD_REQUEST)
    }

    let factoryId = authUser?.factory_id
    if (!factoryId) {
      const { data: center } = await db
        .from(TableName.CENTERS)
        .select(EntityKey.FACTORY_ID)
        .eq(EntityKey.ID, Number(center_id))
        .maybeSingle()

      if (center) {
        factoryId = center.factory_id
      }
    }

    if (!factoryId) {
      return apiError("Could not resolve factory for device entry.", StatusCodes.BAD_REQUEST)
    }

    const nowStr = new Date().toISOString()

    if (status === EntryStatus.APPROVED) {
      await validateSequentialApproval(
        db,
        factoryId,
        vehicle_number,
        nowStr,
        0,
        EntryType.AUTOMATIC
      )
    }

    const { data: newEntry, error: insertErr } = await db
      .from(TableName.ENTRIES)
      .insert({
        [EntityKey.DETECTED_VEHICLE_NUMBER]: detected_vehicle_number,
        [EntityKey.VEHICLE_NUMBER]: vehicle_number,
        [EntityKey.WEIGHT]: Number(weight),
        [EntityKey.TYPE]: EntryType.AUTOMATIC,
        [EntityKey.CENTER_ID]: Number(center_id),
        [EntityKey.PROFILE_ID]: Number(profile_id),
        [EntityKey.CUSTOMER_ID]: customer_id ? Number(customer_id) : null,
        [EntityKey.FACTORY_ID]: factoryId,
        [EntityKey.STATUS]: status,
        [EntityKey.IMAGES]: images,
        [EntityKey.CREATED_AT]: nowStr,
        [EntityKey.UPDATED_AT]: nowStr,
      })
      .select("*")
      .single()

    if (insertErr || !newEntry) {
      console.error("Failed to insert automatic device entry:", insertErr)
      return apiError("Failed to create entry.", StatusCodes.INTERNAL_SERVER_ERROR)
    }

    if (status === EntryStatus.APPROVED) {
      await tryMergeEntries(db, factoryId, newEntry.id)
    }

    return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process device entry creation."
    return apiError(msg, StatusCodes.BAD_REQUEST)
  }
}
