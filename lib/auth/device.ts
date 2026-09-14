/**
 * @file lib/auth/device.ts
 * @description Authentication and key verification utilities for edge IoT devices mapped to users with Role.HARDWARE.
 */

import crypto from "crypto";
import { type NextRequest } from "next/server";
import { StatusCodes } from "http-status-codes";
import { type supabase } from "@/db";
import { type User } from "@/types";
import { Role } from "@/lib/constants/enums";
import { verifyPassword } from "@/lib/auth/password";

export interface DeviceAuthResult {
  success: boolean;
  device?: User;
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
 * Looks up the corresponding user record with role 'hardware' and verifies credentials.
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

  // 1. Fetch active hardware user record from database
  const { data: deviceUser, error } = await client
    .from("users")
    .select("*")
    .eq("id", deviceId)
    .eq("role", Role.HARDWARE)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !deviceUser) {
    return {
      success: false,
      error: "Unauthorized or disabled device",
      status: StatusCodes.FORBIDDEN,
    };
  }

  // 2. Verification check: support both SHA-256 fast hash and Argon2id hash
  const providedHash = hashDeviceKey(deviceKey);
  const storedHash = String(deviceUser.password_hash || "");

  let isMatch = false;
  if (providedHash.length === storedHash.length) {
    isMatch = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash));
  }
  if (!isMatch) {
    isMatch = await verifyPassword(deviceKey, storedHash);
  }

  if (!isMatch) {
    return {
      success: false,
      error: "Invalid device key",
      status: StatusCodes.FORBIDDEN,
    };
  }

  // 3. Update device heartbeat timestamp
  await client
    .from("users")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", deviceUser.id);

  return {
    success: true,
    device: deviceUser as User,
  };
}
