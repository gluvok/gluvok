/**
 * @file lib/auth/device.ts
 * @description Authentication and key verification utilities for edge IoT devices.
 */

import crypto from "crypto";
import { type NextRequest } from "next/server";
import { StatusCodes } from "http-status-codes";
import { type supabase } from "@/db";
import { type Device } from "@/types";

export interface DeviceAuthResult {
  success: boolean;
  device?: Device;
  error?: string;
  status?: StatusCodes;
}

/**
 * Computes the SHA-256 hash of a raw device secret key.
 */
export function hashDeviceKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Authenticates an incoming edge device request via `x-device-id` and `x-device-key` HTTP headers.
 * Uses constant-time equality check to prevent timing attacks and verifies the device is not soft-deleted.
 */
export async function verifyDeviceRequest(
  req: NextRequest,
  client: typeof supabase,
): Promise<DeviceAuthResult> {
  const rawDeviceId = req.headers.get("x-device-id");
  const deviceKey = req.headers.get("x-device-key");

  if (!rawDeviceId || !deviceKey) {
    return {
      success: false,
      error: "Missing device credentials",
      status: StatusCodes.UNAUTHORIZED,
    };
  }

  const deviceId = parseInt(rawDeviceId, 10);
  if (isNaN(deviceId) || deviceId <= 0) {
    return {
      success: false,
      error: "Invalid device ID format",
      status: StatusCodes.BAD_REQUEST,
    };
  }

  // 1. Fetch active device record from database
  const { data: device, error } = await client
    .from("devices")
    .select("*")
    .eq("id", deviceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !device) {
    return {
      success: false,
      error: "Unauthorized or disabled device",
      status: StatusCodes.FORBIDDEN,
    };
  }

  // 2. Constant-time SHA-256 verification to prevent timing attacks
  const providedHash = hashDeviceKey(deviceKey);
  const storedHash = String(device.hashed_key || "");

  const isMatch =
    providedHash.length === storedHash.length &&
    crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash));

  if (!isMatch) {
    return {
      success: false,
      error: "Invalid device key",
      status: StatusCodes.FORBIDDEN,
    };
  }

  // 3. Update device last seen heartbeat
  await client
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  return {
    success: true,
    device: device as Device,
  };
}
