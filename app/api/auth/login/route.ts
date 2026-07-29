/**
 * @file app/api/auth/login/route.ts
 * @description API route for authenticating user credentials with Argon2 and setting JWT cookie.
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyPassword } from "@/lib/auth/password"
import { signJWT } from "@/lib/auth/jwt"
import { EntityKey } from "@/lib/constants/enums"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      )
    }

    // 1. Query user by username
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq(EntityKey.USERNAME, username)
      .maybeSingle()

    if (userError || !user || !user.is_active) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    // 2. Verify password with Argon2id
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    // 3. Immediate permissions & metadata check
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

    // 4. Sign JWT session token
    const token = await signJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
      factory_id: user.factory_id,
    })

    // 5. Construct response with HttpOnly cookie
    const userPayload = {
      id: user.id,
      username: user.username,
      name: profile?.name || customer?.name || user.username,
      role: user.role,
      factory_id: user.factory_id,
      profile: profile || undefined,
      customer: customer || undefined,
    }

    const response = NextResponse.json({ success: true, user: userPayload })

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return response
  } catch (error) {
    console.error("Login API error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    )
  }
}
