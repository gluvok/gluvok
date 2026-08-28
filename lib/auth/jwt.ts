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
  if (typeof exp !== "number" || typeof iat !== "number") {
    throw new Error("Signed JWT is missing an expiration time");
  }
  return Math.max(0, exp - iat);
}

/**
 * Verifies a JWT access token.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  const jwtSecret = getJwtSecret();
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (!payload.sub || typeof payload.username !== "string" || typeof payload.role !== "string") {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username,
      name: typeof payload.name === "string" ? payload.name : payload.username,
      role: payload.role,
      factory_id: Number(payload.factory_id),
      token_version: typeof payload.token_version === "number" ? payload.token_version : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a JWT refresh token.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  const jwtSecret = getJwtSecret();
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (!payload.sub || typeof payload.token_version !== "number") {
      return null;
    }

    return {
      sub: payload.sub,
      token_version: payload.token_version,
    };
  } catch {
    return null;
  }
}
