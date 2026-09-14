/**
 * @file lib/auth/jwt.ts
 * @description JWT signing and verification utilities using jose.
 */

import { decodeJwt, SignJWT, jwtVerify } from "jose";
import { AuthTokenExpiry } from "@/lib/constants";

function getJwtSecret(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is missing");
  }
  return new TextEncoder().encode(jwtSecret);
}

export interface JWTPayload {
  sub: string;
  username: string;
  name: string;
  role: string;
  factory_id: number;
  factory_name?: string;
  token_version?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  token_version: number;
}

/**
 * Signs a short-lived JWT access token (defaults to 5 minutes).
 */
export async function signJWT(
  payload: JWTPayload,
  expiresIn: string = AuthTokenExpiry.ACCESS_TOKEN,
): Promise<string> {
  return new SignJWT({
    username: payload.username,
    name: payload.name,
    role: payload.role,
    factory_id: payload.factory_id,
    ...(payload.factory_name ? { factory_name: payload.factory_name } : {}),
    ...(payload.token_version != null ? { token_version: payload.token_version } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

/**
 * Signs a long-lived JWT refresh token (defaults to 7 days).
 */
export async function signRefreshToken(
  payload: RefreshTokenPayload,
  expiresIn: string = AuthTokenExpiry.REFRESH_TOKEN,
): Promise<string> {
  return new SignJWT({
    token_version: payload.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export function getTokenExpiresIn(token: string): number {
  const { exp, iat } = decodeJwt(token);
  if (exp && iat) {
    return exp - iat;
  }
  return 15 * 60;
}

/**
 * Verifies a JWT access token and returns its payload if valid.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    return {
      sub: payload.sub,
      username: (payload.username as string) || "",
      name: (payload.name as string) || "",
      role: (payload.role as string) || "",
      factory_id: (payload.factory_id as number) || 1,
      factory_name: (payload.factory_name as string) || undefined,
      token_version: payload.token_version as number | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a JWT refresh token and returns its payload if valid.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || typeof payload.sub !== "string" || payload.token_version === undefined) {
      return null;
    }

    return {
      sub: payload.sub,
      token_version: payload.token_version as number,
    };
  } catch {
    return null;
  }
}
