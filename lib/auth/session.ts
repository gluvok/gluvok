/**
 * @file lib/auth/session.ts
 * @description Server-side session management for immediate revocation and zero-cookie edge device support.
 */

import crypto from "crypto";
import { db, supabase } from "@/db";
import { AuthUserPayload } from "@/types";
import { Role } from "@/lib/constants/enums";

import { getSessionExpirySeconds } from "./cookies";

export type { AuthUserPayload };

export const DEFAULT_PERMANENT_SESSION_EXPIRY_DAYS = 365 * 100; // 100 years (~permanent)
export const DEFAULT_SESSION_EXPIRY_DAYS = DEFAULT_PERMANENT_SESSION_EXPIRY_DAYS;

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

export interface CreateSessionOptions {
  expiresInDays?: number;
  expiresInSeconds?: number;
}

/**
 * Creates a new session record in the database for the given user.
 */
export async function createSession(
  userId: number,
  options: CreateSessionOptions = {},
): Promise<CreateSessionResult> {
  let durationMs: number;
  if (options.expiresInSeconds !== undefined) {
    durationMs =
      options.expiresInDays !== undefined
        ? options.expiresInSeconds * 1000
        : options.expiresInSeconds * 1000;
  } else if (options.expiresInDays !== undefined) {
    durationMs = options.expiresInDays * 24 * 60 * 60 * 1000;
  } else if (process.env.SESSION_MAX_AGE_SECONDS || process.env.SESSION_EXPIRY_DAYS) {
    durationMs = getSessionExpirySeconds() * 1000;
  } else {
    durationMs = DEFAULT_PERMANENT_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("sessions")
    .insert({
      token,
      user_id: userId,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
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
): Promise<AuthUserPayload | null> {
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
      updated_at,
      deleted_at,
      users!inner (
        id,
        username,
        name,
        role,
        factory_id,
        deleted_at,
        factories (
          name
        )
      )
    `);

    if (!selectQuery || typeof selectQuery.eq !== "function") {
      return null;
    }

    let eqQuery = selectQuery.eq("token", token);
    if (eqQuery && typeof eqQuery.is === "function") {
      eqQuery = eqQuery.is("deleted_at", null);
    }
    if (!eqQuery || typeof eqQuery.gt !== "function") {
      return null;
    }

    const { data: session, error } = await eqQuery.gt("expires_at", now).maybeSingle();

    if (error || !session || session.deleted_at != null) {
      return null;
    }

    const rawUser = session.users;
    const user = (Array.isArray(rawUser) ? rawUser[0] : rawUser) as unknown as {
      id: number;
      username: string;
      name: string;
      role: string;
      factory_id: number;
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
      role: user.role as Role,
      factory_id: user.factory_id,
      factory_name: user.factories?.name,
    };
  } catch {
    return null;
  }
}

/**
 * Soft-deletes a session by its token (used during logout).
 */
export async function deleteSession(token: string, client = db): Promise<void> {
  if (!token) return;
  try {
    const table = client.from("sessions");
    if (table && typeof table.update === "function") {
      const query = table.update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (query && typeof query.eq === "function") {
        await query.eq("token", token);
        return;
      }
    }
    if (table && typeof table.delete === "function") {
      const delQuery = table.delete();
      if (delQuery && typeof delQuery.eq === "function") {
        await delQuery.eq("token", token);
      }
    }
  } catch {
    // Ignore error if sessions table not available or mock does not implement it
  }
}

/**
 * Soft-deletes all active sessions for a user (used on password change, user deactivation, or security reset).
 */
export async function deleteAllUserSessions(userId: number, client = db): Promise<void> {
  if (!userId) return;
  try {
    const table = client.from("sessions");
    if (table && typeof table.update === "function") {
      const query = table.update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (query && typeof query.eq === "function") {
        await query.eq("user_id", userId);
        return;
      }
    }
    if (table && typeof table.delete === "function") {
      const delQuery = table.delete();
      if (delQuery && typeof delQuery.eq === "function") {
        await delQuery.eq("user_id", userId);
      }
    }
  } catch {
    // Ignore error if sessions table not available or mock does not implement it
  }
}
