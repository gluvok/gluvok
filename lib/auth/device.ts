/**
 * @file lib/auth/device.ts
 * @description Authentication utilities for edge IoT devices using username and password.
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
 * Computes the SHA-256 hash of a raw device password/key.
 */
export function hashDeviceKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Checks whether an incoming request includes device authentication credentials
 * (HTTP Basic Auth, x-username/x-password headers, or multipart form fields).
 */
export function hasDeviceCredentials(req: NextRequest, formData?: FormData): boolean {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("basic ")) return true;
  if (req.headers.has("x-username") || req.headers.has("x-password")) return true;
  if (formData && (formData.has("username") || formData.has("password"))) return true;
  return false;
}

/**
 * Authenticates an incoming edge device request via username and password.
 * Accepts:
 * 1. HTTP Basic Auth: `Authorization: Basic <base64(username:password)>`
 * 2. FormData fields: `username` and `password`
 * 3. Custom headers: `x-username` and `x-password`
 *
 * Looks up the active user record with role 'hardware' and verifies password hash.
 */
export async function verifyDeviceRequest(
  req: NextRequest,
  client: typeof supabase,
  formData?: FormData,
): Promise<DeviceAuthResult> {
  let username: string | null = null;
  let password: string | null = null;

  // 1. Try HTTP Basic Auth: Authorization: Basic <base64(username:password)>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("basic ")) {
    try {
      const base64Credentials = authHeader.slice(6).trim();
      const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const colonIndex = decoded.indexOf(":");
      if (colonIndex !== -1) {
        username = decoded.substring(0, colonIndex);
        password = decoded.substring(colonIndex + 1);
      }
    } catch {
      // ignore decode error, will fail on missing credentials
    }
  }

  // 2. Try FormData fields if provided
  if (!username && formData) {
    const u = formData.get("username");
    const p = formData.get("password");
    if (typeof u === "string") username = u;
    if (typeof p === "string") password = p;
  }

  // 3. Try custom headers: x-username / x-password
  if (!username) {
    username = req.headers.get("x-username");
    password = req.headers.get("x-password");
  }

  if (!username || !password) {
    return {
      success: false,
      error: "Missing device credentials",
      status: StatusCodes.UNAUTHORIZED,
    };
  }

  // Fetch active hardware user record from database by username
  const { data: deviceUser, error } = await client
    .from("users")
    .select("*")
    .eq("username", username)
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

  // Verification check: support both Argon2id hash and SHA-256 fast hash
  const providedHash = hashDeviceKey(password);
  const storedHash = String(deviceUser.password_hash || "");

  let isMatch = false;
  if (providedHash.length === storedHash.length) {
    isMatch = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash));
  }
  if (!isMatch) {
    isMatch = await verifyPassword(password, storedHash);
  }

  if (!isMatch) {
    return {
      success: false,
      error: "Invalid device credentials",
      status: StatusCodes.FORBIDDEN,
    };
  }

  // Update device heartbeat timestamp
  await client
    .from("users")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", deviceUser.id);

  return {
    success: true,
    device: deviceUser as User,
  };
}
