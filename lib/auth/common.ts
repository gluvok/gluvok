/**
 * @file lib/auth/common.ts
 * @description Shared authentication building blocks for credential verification and token generation.
 */

import { db } from "@/db";
import { Role } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants/messages";
import { verifyPassword } from "@/lib/auth/password";
import { signJWT, signRefreshToken, getTokenExpiresIn } from "@/lib/auth/jwt";

export interface AuthenticatedUserRecord {
  id: number;
  username: string;
  name: string;
  password_hash: string;
  role: Role;
  factory_id: number;
  token_version?: number;
  factories?: { name?: string };
}

export interface UserSessionPayload {
  id: number;
  username: string;
  name: string;
  role: Role;
  factory_id: number;
  factory_name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
  expiresIn: number;
}

export interface CredentialsVerificationResult {
  user: AuthenticatedUserRecord;
  userPayload: UserSessionPayload;
}

export function toUserSessionPayload(
  user: AuthenticatedUserRecord,
  factoryName?: string,
): UserSessionPayload {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    factory_id: user.factory_id,
    factory_name: factoryName || user.factories?.name,
  };
}

/**
 * Fetches an active (non-deleted) user record by primary key ID.
 */
export async function fetchActiveUserById(userId: number): Promise<AuthenticatedUserRecord | null> {
  const { data: user, error } = await db
    .from("users")
    .select("*, factories(name)")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Validates provided credentials against the users table and verifies the password hash.
 */
export async function verifyUserCredentials(
  username?: string,
  password?: string,
): Promise<{ result?: CredentialsVerificationResult; error?: string; status?: number }> {
  if (!username || !password) {
    return { error: AuthErrorMessage.REQUIRED_FIELDS, status: 400 };
  }

  const { data: user, error: userError } = await db
    .from("users")
    .select("*, factories(name)")
    .eq("username", username)
    .is("deleted_at", null)
    .maybeSingle();

  if (userError || !user) {
    return { error: AuthErrorMessage.INVALID_CREDENTIALS, status: 401 };
  }

  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return { error: AuthErrorMessage.INVALID_CREDENTIALS, status: 401 };
  }

  return {
    result: {
      user,
      userPayload: toUserSessionPayload(user, user.factories?.name),
    },
  };
}

/**
 * Signs and packages access and refresh tokens for an authenticated user.
 */
export async function generateAuthTokens(user: AuthenticatedUserRecord): Promise<AuthTokens> {
  const factoryId = user.factory_id;
  const tokenVersion = user.token_version ?? 1;

  const accessToken = await signJWT({
    sub: String(user.id),
    username: user.username,
    name: user.name,
    role: user.role,
    factory_id: factoryId,
    factory_name: user.factories?.name,
  });
  const accessExpiresIn = getTokenExpiresIn(accessToken);

  const refreshToken = await signRefreshToken({
    sub: String(user.id),
    token_version: tokenVersion,
  });
  const refreshExpiresIn = getTokenExpiresIn(refreshToken);

  return {
    accessToken,
    refreshToken,
    accessExpiresIn,
    refreshExpiresIn,
    expiresIn: accessExpiresIn,
  };
}
