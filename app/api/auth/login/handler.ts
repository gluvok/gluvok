import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getTokenExpiresIn, signJWT } from "@/lib/auth/jwt"
import { verifyPassword } from "@/lib/auth/password"
import { AuthErrorMessage, CookieName, Role, TableName } from "@/lib/constants"

type LoginClient = "browser" | "device"

export async function handleLogin(request: NextRequest, client: LoginClient) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: AuthErrorMessage.REQUIRED_FIELDS },
        { status: 400 }
      )
    }

    const { data: user, error: userError } = await db
      .from(TableName.USERS)
      .select("*")
      .eq("username", username)
      .maybeSingle()

    if (userError || !user || !user.is_active) {
      return NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    const factoryId = user.factory_id ?? null
    let profileId: number | undefined

    if (client === "device") {
      if (user.role !== Role.OPERATOR) {
        return NextResponse.json(
          { error: AuthErrorMessage.INVALID_CREDENTIALS },
          { status: 401 }
        )
      }

      const { data: profile } = await db
        .from(TableName.PROFILES)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!profile) {
        return NextResponse.json({ error: "Operator profile not found" }, { status: 404 })
      }
      profileId = profile.id
    }

    const token = await signJWT(
      {
        sub: String(user.id),
        username: user.username,
        role: user.role,
        factory_id: factoryId,
        profile_id: profileId,
      },
      client === "device" ? process.env.JWT_DEVICE_EXPIRES_IN || "1d" : undefined
    )
    const expiresIn = getTokenExpiresIn(token)
    const userPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      factory_id: factoryId,
    }

    if (client === "device") {
      return NextResponse.json({
        success: true,
        access_token: token,
        token_type: "Bearer",
        expires_in: expiresIn,
        profile_id: profileId,
        user: userPayload,
      })
    }

    const response = NextResponse.json({ success: true, user: userPayload })
    response.cookies.set(CookieName.TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn,
      path: "/",
    })
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: AuthErrorMessage.INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}