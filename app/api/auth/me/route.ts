/**
 * @file app/api/auth/me/route.ts
 * @description API route to verify active JWT session and return user profile & permissions using Drizzle ORM.
 */

import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { getDb } from "@/db"
import { getTables } from "@/db/schema"
import { verifyJWT } from "@/lib/auth/jwt"
import { DatabasePropertyKey, TenantMode } from "@/lib/constants/enums";
import { getWorkspace } from "@/lib/tenant/workspace"
import { resolveTenant } from "@/lib/tenant"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value || cookieStore.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ user: null })
    }

    const userId = parseInt(payload.sub, 10)
    if (isNaN(userId)) {
      return NextResponse.json({ user: null })
    }

    // Resolve tenant DB based on request subdomain/workspace
    const workspace = getWorkspace(request)
    const tenant = resolveTenant(workspace)
    const tenantDb = getDb(tenant)
    const { users, profiles, customers } = getTables(tenant.mode)

    // Verify user account is still valid and active in database
    const [user] = await tenantDb
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null })
    }

    // Load profile or customer metadata
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

    const factoryId =
      tenant.mode === TenantMode.SHARED
        ? ((DatabasePropertyKey.FACTORY_ID in user
            ? (user as { [DatabasePropertyKey.FACTORY_ID]: number | null })[
                DatabasePropertyKey.FACTORY_ID
              ]
            : null) ?? null)
        : null;

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

    return NextResponse.json({ user: userPayload })
  } catch (error) {
    console.error("Auth /me error:", error)
    return NextResponse.json({ user: null })
  }
}
