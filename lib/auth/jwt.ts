/**
 * @file lib/auth/jwt.ts
 * @description JWT signing and verification utilities using jose.
 */

import { SignJWT, jwtVerify } from "jose"
import { TenantMode } from "@/lib/constants/enums"

function getJwtSecret(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is missing");
  }
  return new TextEncoder().encode(jwtSecret);
}

export interface JWTPayload {
  sub: string
  name?: string
  username: string
  role: string
  factory_id: number | null
  tenant_mode: TenantMode
}

/**
 * Signs a JWT session token with expiration time from environment variables (defaults to 1 year).
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRATION_TIME || "1y";

  return new SignJWT({
    name: payload.name ?? "",
    username: payload.username,
    role: payload.role,
    factory_id: payload.factory_id ?? null,
    tenant_mode: payload.tenant_mode,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
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
      name: typeof payload.name === "string" ? payload.name : undefined,
      username: payload.username,
      role: payload.role,
      factory_id: typeof payload.factory_id === "number" ? payload.factory_id : null,
      tenant_mode: payload.tenant_mode === TenantMode.DEDICATED ? TenantMode.DEDICATED : TenantMode.SHARED,
    }
  } catch {
    return null
  }
}
