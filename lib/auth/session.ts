/**
 * @file lib/auth/session.ts
 * @description Server-side session management for immediate revocation and zero-cookie edge device support.
 */

import crypto from "crypto";
import { db } from "@/db";
import { AuthUserPayload } from "@/types";
import { Role } from "@/lib/constants/enums";

import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import { LRUCache } from "lru-cache";

export type { AuthUserPayload };

/**
 * Reverse index mapping userId -> Set of active cached tokens for instant multi-token invalidation.
 */
export const userTokensMap = new Map<number, Set<string>>();

/**
 * In-memory LRU cache for valid sessions with a 1-hour TTL.
 * Eliminates redundant database hits on rapid consecutive requests.
 */
export const sessionCache = new LRUCache<string, AuthUserPayload>({
  max: 5000,
  ttl: 60 * 60 * 1000, // 1 hour
  ttlAutopurge: true,
  dispose: (user, token) => {
    const userId = Number(user.sub);
    if (!isNaN(userId)) {
      userTokensMap.get(userId)?.delete(token);
    }
  },
});

export function clearSessionCache(): void {
  sessionCache.clear();
  userTokensMap.clear();
}

export function invalidateSessionInCache(token: string): void {
  const cached = sessionCache.get(token);
  if (cached) {
    const userId = Number(cached.sub);
    userTokensMap.get(userId)?.delete(token);
  }
  sessionCache.delete(token);
}

export function invalidateUserSessionsInCache(userId: number): void {
  const tokens = userTokensMap.get(userId);
  if (tokens) {
    for (const token of tokens) {
      sessionCache.delete(token);
    }
    userTokensMap.delete(userId);
  }
}

export function invalidateFactorySessionsInCache(factoryId: number): void {
  for (const [token, payload] of sessionCache.entries()) {
    if (payload.factory_id === factoryId) {
      invalidateSessionInCache(token);
    }
  }
}

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
  expiresInSeconds?: number;
}

/**
 * Creates a new session record in the database for the given user.
 */
export async function createSession(
  userId: number,
  options: CreateSessionOptions = {},
  client = db,
): Promise<CreateSessionResult> {
  const durationSeconds = options.expiresInSeconds ?? SESSION_MAX_AGE_SECONDS;
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

  const now = new Date().toISOString();
  const { data, error } = await client
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
 * Refreshes the expiration timestamp of an active session in the database (sliding expiration).
 */
export async function refreshSessionExpiry(token: string, client = db): Promise<void> {
  if (!token || typeof token !== "string") return;
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  await client
    .from("sessions")
    .update({ expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("token", token)
    .is("deleted_at", null);
}

/**
 * Validates an incoming session token against active database sessions and returns the user payload.
 * Checks the in-memory LRU cache first; misses fall back to the database.
 * Instantly returns null if the session is revoked, expired, or the user account is soft-deleted.
 */
export async function validateSession(
  token: string,
  client = db,
  skipCache = false,
): Promise<AuthUserPayload | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  // 1. Fast in-memory cache lookup
  if (!skipCache) {
    const cached = sessionCache.get(token);
    if (cached) {
      return cached;
    }
  }

  try {
    const now = new Date().toISOString();
    const { data: session, error } = await client
      .from("sessions")
      .select(`
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
            name,
            receipt_images_per_row
          )
        )
      `)
      .eq("token", token)
      .is("deleted_at", null)
      .gt("expires_at", now)
      .maybeSingle();

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
      factories?:
        | { name?: string; receipt_images_per_row?: number }
        | { name?: string; receipt_images_per_row?: number }[]
        | null;
    } | null;

    if (!user || user.deleted_at != null) {
      return null;
    }

    const factoryObj = Array.isArray(user.factories) ? user.factories[0] : user.factories;

    const payload: AuthUserPayload = {
      sub: String(user.id),
      username: user.username,
      name: user.name,
      role: user.role as Role,
      factory_id: user.factory_id,
      factory_name: factoryObj?.name,
      receipt_images_per_row: factoryObj ? (factoryObj.receipt_images_per_row ?? 3) : undefined,
    };

    // Store in LRU cache and update reverse user index
    sessionCache.set(token, payload);
    let userTokens = userTokensMap.get(user.id);
    if (!userTokens) {
      userTokens = new Set<string>();
      userTokensMap.set(user.id, userTokens);
    }
    userTokens.add(token);

    return payload;
  } catch {
    return null;
  }
}

/**
 * Soft-deletes a session by its token (used during logout).
 * Immediately purges the token from the in-memory cache.
 */
export async function deleteSession(token: string, client = db): Promise<void> {
  if (!token) return;
  invalidateSessionInCache(token);
  const now = new Date().toISOString();
  await client.from("sessions").update({ deleted_at: now, updated_at: now }).eq("token", token);
}

/**
 * Soft-deletes all active sessions for a user (used on password change, user deactivation, or security reset).
 * Immediately purges all tokens for the user from the in-memory cache.
 */
export async function deleteAllUserSessions(userId: number, client = db): Promise<void> {
  if (!userId) return;
  invalidateUserSessionsInCache(userId);
  const now = new Date().toISOString();
  await client.from("sessions").update({ deleted_at: now, updated_at: now }).eq("user_id", userId);
}
