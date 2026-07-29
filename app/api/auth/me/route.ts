/**
 * @file app/api/auth/me/route.ts
 * @description API route to verify active JWT session and return user profile & permissions.
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/auth/jwt"
import { supabase } from "@/lib/supabase"
import { EntityKey } from "@/lib/constants/enums"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ user: null })
    }

    // Verify user account is still valid and active in database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq(EntityKey.ID, payload.sub)
      .maybeSingle()

    if (userError || !user || !user.is_active) {
      return NextResponse.json({ user: null })
    }

    // Load profile or customer metadata
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq(EntityKey.USER_ID, user.id)
      .maybeSingle()

    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq(EntityKey.USER_ID, user.id)
      .maybeSingle()

    const userPayload = {
      id: user.id,
      username: user.username,
      name: profile?.name || customer?.name || user.username,
      role: user.role,
      factory_id: user.factory_id,
      profile: profile || undefined,
      customer: customer || undefined,
    }

    return NextResponse.json({ user: userPayload })
  } catch (error) {
    console.error("Auth /me error:", error)
    return NextResponse.json({ user: null })
  }
}
