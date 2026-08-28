/**
 * @file lib/auth/common.ts
 * @description Shared authentication building blocks for credential verification and token generation.
 */

import { db } from "@/db";
import { TableName, EntityKey, Role } from "@/lib/constants/enums";
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
  aadhar_number?: string | null;
  token_version?: number;
}

export interface UserSessionPayload {
  id: number;
  username: string;
  name: string;
  aadhar_number: string | null;
  role: Role;
  factory_id: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface CredentialsVerificationResult {
  user: AuthenticatedUserRecord;
  userPayload: UserSessionPayload;
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
    .from(TableName.USERS)
    .select("*")
    .eq(EntityKey.USERNAME, username)
    .is(EntityKey.DELETED_AT, null)
    .maybeSingle();

  if (userError || !user) {
    return { error: AuthErrorMessage.INVALID_CREDENTIALS, status: 401 };
  }

  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return { error: AuthErrorMessage.INVALID_CREDENTIALS, status: 401 };
  }

  const userPayload: UserSessionPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    aadhar_number: user.aadhar_number ?? null,
    role: user.role,
    factory_id: user.factory_id,
  };

  return {
    result: {
      user,
      userPayload,
    },
  };
}

/**
 * Signs and packages access and refresh tokens for an authenticated user.
 */
export async function generateAuthTokens(user: AuthenticatedUserRecord): Promise<AuthTokens> {
  const factoryId = user.factory_id;
  const tokenVersion = typeof user.token_version === "number" ? user.token_version : 1;

  const accessToken = await signJWT({
    sub: String(user.id),
    username: user.username,
    name: user.name,
    role: user.role,
    factory_id: factoryId,
  });
  const expiresIn = getTokenExpiresIn(accessToken);

  const refreshToken = await signRefreshToken({
    sub: String(user.id),
    token_version: tokenVersion,
  });
  const refreshExpiresIn = getTokenExpiresIn(refreshToken);

  return {
    accessToken,
    refreshToken,
    expiresIn,
    refreshExpiresIn,
  };
}
