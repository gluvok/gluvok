/**
 * @file lib/auth/jwt.ts
 * @description JWT signing and verification utilities using jose.
 */

import { decodeJwt, SignJWT, jwtVerify } from "jose"
import { TenantMode } from "@/lib/constants/enums"

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
  role: string;
  factory_id: number | null;
  profile_id?: number;
  tenant_mode: TenantMode;
}

/**
 * Signs a JWT session token with expiration time from environment variables (defaults to 1 year).
 */
export async function signJWT(
  payload: JWTPayload,
  expiresIn = process.env.JWT_EXPIRES_IN ||
    process.env.JWT_EXPIRATION_TIME ||
    "1y",
): Promise<string> {
  return new SignJWT({
    username: payload.username,
    role: payload.role,
    factory_id: payload.factory_id ?? null,
    ...(payload.profile_id != null ? { profile_id: payload.profile_id } : {}),
    tenant_mode: payload.tenant_mode,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export function getTokenExpiresIn(token: string): number {
  const { exp, iat } = decodeJwt(token)
  if (typeof exp !== "number" || typeof iat !== "number") {
    throw new Error("Signed JWT is missing an expiration time")
  }
  return Math.max(0, exp - iat)
}

/**
 * Verifies a JWT session token.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  const jwtSecret = getJwtSecret();
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (!payload.sub || typeof payload.username !== "string" || typeof payload.role !== "string") {
      return null
    }

    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      factory_id:
        typeof payload.factory_id === "number" ? payload.factory_id : null,
      profile_id:
        typeof payload.profile_id === "number" ? payload.profile_id : undefined,
      tenant_mode:
        payload.tenant_mode === TenantMode.DEDICATED
          ? TenantMode.DEDICATED
          : TenantMode.SHARED,
    };
  } catch {
    return null
  }
}
