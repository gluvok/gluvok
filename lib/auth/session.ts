/**
 * @file lib/auth/session.ts
 * @description Server-side session management for immediate revocation and zero-cookie edge device support.
 */

import crypto from "crypto";
import { db, supabase } from "@/db";
import { JWTPayload } from "./jwt";

export const DEFAULT_SESSION_EXPIRY_DAYS = 7;

/**
 * Generates a cryptographically secure 256-bit random session token string.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface CreateSessionResult {
  id: number;
  token: string;
}

/**
 * Creates a new session record in the database for the given user.
 */
export async function createSession(
  userId: number,
  options: { expiresInDays?: number } = {},
): Promise<CreateSessionResult> {
  const expiresInDays = options.expiresInDays ?? DEFAULT_SESSION_EXPIRY_DAYS;
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("sessions")
    .insert({
      token,
      user_id: userId,
      expires_at: expiresAt,
    })
    .select("id, token")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message || "Unknown database error"}`);
  }

  return {
    id: data.id,
    token: data.token,
  };
}

/**
 * Validates an incoming session token against active database sessions and returns the user payload.
 * Instantly returns null if the session is revoked, expired, or the user account is soft-deleted.
 */
export async function validateSession(
  token: string,
  client?: typeof supabase,
): Promise<JWTPayload | null> {
  const db = client || supabase;
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  try {
    const table = db.from?.("sessions");
    if (!table || typeof table.select !== "function") {
      return null;
    }

    const now = new Date().toISOString();
    const selectQuery = table.select(`
      id,
      token,
      expires_at,
      user_id,
      last_active_at,
      users!inner (
        id,
        username,
        name,
        role,
        factory_id,
        center_id,
        deleted_at,
        factories (
          name
        )
      )
    `);

    if (!selectQuery || typeof selectQuery.eq !== "function") {
      return null;
    }

    const eqQuery = selectQuery.eq("token", token);
    if (!eqQuery || typeof eqQuery.gt !== "function") {
      return null;
    }

    const { data: session, error } = await eqQuery.gt("expires_at", now).maybeSingle();

    if (error || !session) {
      return null;
    }

    const rawUser = session.users;
    const user = (Array.isArray(rawUser) ? rawUser[0] : rawUser) as unknown as {
      id: number;
      username: string;
      name: string;
      role: string;
      factory_id: number;
      center_id?: number | null;
      deleted_at?: string | null;
      factories?: { name?: string } | null;
    } | null;

    if (!user || user.deleted_at != null) {
      return null;
    }

    return {
      sub: String(user.id),
      username: user.username,
      name: user.name,
      role: user.role,
      factory_id: user.factory_id,
      factory_name: user.factories?.name,
      center_id: user.center_id,
    };
  } catch {
    return null;
  }
}

/**
 * Deletes a session by its token (used during logout).
 */
export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await db.from("sessions").delete().eq("token", token);
}

/**
 * Deletes all active sessions for a user (used on user deactivation or security reset).
 */
export async function deleteAllUserSessions(userId: number): Promise<void> {
  if (!userId) return;
  await db.from("sessions").delete().eq("user_id", userId);
}
