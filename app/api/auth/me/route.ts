/**
 * @file app/api/auth/me/route.ts
 * @description API route to verify active JWT session and return user info using Supabase JS client.
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/db"
import { verifyJWT } from "@/lib/auth/jwt"
import { CookieName, TableName } from "@/lib/constants/enums"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token =
      cookieStore.get(CookieName.TOKEN)?.value ||
      cookieStore.get(CookieName.AUTH_TOKEN)?.value

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

    const { data: user, error } = await db
      .from(TableName.USERS)
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (error || !user || !user.is_active) {
      return NextResponse.json({ user: null })
    }

    const userPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      aadhar_number: user.aadhar_number ?? null,
      role: user.role,
      factory_id: user.factory_id ?? null,
    }

    return NextResponse.json({ user: userPayload })
  } catch (error) {
    console.error("Auth /me error:", error)
    return NextResponse.json({ user: null })
  }
}
