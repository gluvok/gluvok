/**
 * @file app/api/auth/login/route.ts
 * @description API route for authenticating user credentials with Argon2 and Drizzle ORM.
 */

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users, profiles, customers } from "@/db/schema"
import { verifyPassword } from "@/lib/auth/password"
import { signJWT } from "@/lib/auth/jwt"

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

    // 1. Query user by username using Drizzle ORM
    const [user] = await db
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
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    // 3. Immediate permissions & metadata check using Drizzle ORM
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

    // 4. Sign JWT session token
    const token = await signJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
      factory_id: user.factoryId,
    })

    // 5. Construct response with HttpOnly cookie
    const userPayload = {
      id: user.id,
      username: user.username,
      name: profile?.name || customer?.name || user.username,
      role: user.role,
      factory_id: user.factoryId,
      profile: profile || undefined,
      customer: customer || undefined,
    }

    const response = NextResponse.json({ success: true, user: userPayload })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    }

    response.cookies.set("token", token, cookieOptions)
    response.cookies.set("auth_token", token, cookieOptions)

    return response
  } catch (error) {
    console.error("Login API error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    )
  }
}
