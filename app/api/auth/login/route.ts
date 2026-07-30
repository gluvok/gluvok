/**
 * @file app/api/auth/login/route.ts
 * @description API route for authenticating user credentials with Argon2 and Drizzle ORM.
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema"
import { verifyPassword } from "@/lib/auth/password"
import { signJWT } from "@/lib/auth/jwt"
import {
  CookieName,
  DatabasePropertyKey,
  TenantMode,
} from "@/lib/constants/enums";
import { getWorkspace } from "@/lib/tenant/workspace"
import { resolveTenant } from "@/lib/tenant"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      )
    }

    // Resolve tenant from request subdomain
    const workspace = getWorkspace(request)
    const tenant = resolveTenant(workspace)
    const { users, profiles, customers } = getTables(tenant.mode)

    // Import getDb lazily to avoid circular issues — db/index exports it
    const { getDb } = await import("@/db")
    const tenantDb = getDb(tenant)

    // 1. Query user by username
    const [user] = await tenantDb
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    // 2. Verify password with Argon2id
    const isValidPassword = await verifyPassword(
      password,
      user[DatabasePropertyKey.PASSWORD_HASH],
    );
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    // 3. Load profile/customer metadata
    const [profile] = await tenantDb
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1)

    const [customer] = await tenantDb
      .select()
      .from(customers)
      .where(eq(customers.userId, user.id))
      .limit(1)

    // 4. Sign JWT — factory_id is null in dedicated mode (no factory column)
    const factoryId =
      tenant.mode === TenantMode.SHARED
        ? ((DatabasePropertyKey.FACTORY_ID in user
            ? (user as typeof sharedSchema.users.$inferSelect)[
                DatabasePropertyKey.FACTORY_ID
              ]
            : null) ?? null)
        : null;

    const token = await signJWT({
      sub: String(user.id),
      username: user.username,
      role: user.role,
      factory_id: factoryId,
      tenant_mode: tenant.mode,
    })

    const userPayload = {
      id: user.id,
      username: user.username,
      name: profile?.name || customer?.name || user.username,
      role: user.role,
      factory_id: factoryId,
      tenant_mode: tenant.mode,
      profile: profile || undefined,
      customer: customer || undefined,
    }

    const response = NextResponse.json({ success: true, user: userPayload })
    response.cookies.set(CookieName.TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
