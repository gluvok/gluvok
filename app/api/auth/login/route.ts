/**
 * @file app/api/auth/login/route.ts
 * @description API route for authenticating user credentials with Argon2 and Drizzle ORM.
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getTables } from "@/db/schema"
import { verifyPassword } from "@/lib/auth/password"
import { signJWT } from "@/lib/auth/jwt"
import {
  CookieName,
  TenantMode,
  AuthErrorMessage,
} from "@/lib/constants";
import { getWorkspace } from "@/lib/tenant/workspace"
import { resolveTenant } from "@/lib/tenant"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: AuthErrorMessage.REQUIRED_FIELDS },
        { status: 400 }
      )
    }

    // Resolve tenant from request subdomain
    const workspace = getWorkspace(request)
    const tenant = resolveTenant(workspace)
    const { users } = getTables(tenant.mode)

    // Import getDb lazily to avoid circular issues — db/index exports it
    const { getDb } = await import("@/db")
    const tenantDb = getDb(tenant)

    // 1. Query user by username
    const [user] = await tenantDb
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    // 2. Verify password with Argon2id
    const isValidPassword = await verifyPassword(
      password,
      user.password_hash,
    );
    if (!isValidPassword) {
      return NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    // 3. Sign JWT — factory_id is null in dedicated mode (no factory column)
    const factoryId =
      tenant.mode === TenantMode.SHARED
        ? ("factory_id" in user
            ? (user as unknown as { factory_id: number | null }).factory_id
            : null)
        : null;

    const token = await signJWT({
      sub: String(user.id),
      name: user.name,
      username: user.username,
      role: user.role,
      factory_id: factoryId,
      tenant_mode: tenant.mode,
    })

    const userPayload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      factory_id: factoryId,
      tenant_mode: tenant.mode,
    }

    const response = NextResponse.json({ success: true, user: userPayload })
    response.cookies.set(CookieName.TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return response
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
