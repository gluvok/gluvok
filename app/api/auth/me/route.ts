/**
 * @file app/api/auth/me/route.ts
 * @description API route to verify active JWT session and return user profile & permissions using Drizzle ORM.
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users, profiles, customers } from "@/db/schema"
import { verifyJWT } from "@/lib/auth/jwt"

export async function GET() {
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

    // Verify user account is still valid and active in database using Drizzle ORM
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null })
    }

    // Load profile or customer metadata using Drizzle ORM
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1)

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, user.id))
      .limit(1)

    const userPayload = {
      id: user.id,
      username: user.username,
      name: profile?.name || customer?.name || user.username,
      role: user.role,
      factory_id: user.factoryId,
      profile: profile || undefined,
      customer: customer || undefined,
    }

    return NextResponse.json({ user: userPayload })
  } catch (error) {
    console.error("Auth /me error:", error)
    return NextResponse.json({ user: null })
  }
}
