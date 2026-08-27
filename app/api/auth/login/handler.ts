import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getTokenExpiresIn, signJWT, signRefreshToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import {
  AuthErrorMessage,
  CookieName,
  EntityKey,
  LoginClient,
  Role,
  TableName,
} from "@/lib/constants";

export async function handleLogin(request: NextRequest, client: LoginClient) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: AuthErrorMessage.REQUIRED_FIELDS }, { status: 400 });
    }

    const { data: user, error: userError } = await db
      .from(TableName.USERS)
      .select("*")
      .eq(EntityKey.USERNAME, username)
      .is(EntityKey.DELETED_AT, null)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ error: AuthErrorMessage.INVALID_CREDENTIALS }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: AuthErrorMessage.INVALID_CREDENTIALS }, { status: 401 });
    }

    if (client === LoginClient.DEVICE && user.role !== Role.OPERATOR) {
      return NextResponse.json({ error: AuthErrorMessage.INVALID_CREDENTIALS }, { status: 401 });
    }

    const factoryId = user.factory_id ?? null;
    const tokenVersion = typeof user.token_version === "number" ? user.token_version : 1;

    const token = await signJWT(
      {
        sub: String(user.id),
        username: user.username,
        name: user.name,
        role: user.role,
        factory_id: factoryId,
      },
      client === LoginClient.DEVICE ? process.env.JWT_DEVICE_EXPIRES_IN || "1d" : undefined,
    );
    const expiresIn = getTokenExpiresIn(token);

    const refreshToken = await signRefreshToken(
      {
        sub: String(user.id),
        token_version: tokenVersion,
      },
      client === LoginClient.DEVICE
        ? process.env.JWT_DEVICE_REFRESH_EXPIRES_IN || "30d"
        : undefined,
    );
    const refreshExpiresIn = getTokenExpiresIn(refreshToken);

    const userPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      aadhar_number: user.aadhar_number ?? null,
      role: user.role,
      factory_id: factoryId,
    };

    if (client === LoginClient.DEVICE) {
      return NextResponse.json({
        success: true,
        access_token: token,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: expiresIn,
        user_id: user.id,
        user: userPayload,
      });
    }

    const response = NextResponse.json({ success: true, user: userPayload });
    response.cookies.set(CookieName.TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn,
      path: "/",
    });
    response.cookies.set(CookieName.REFRESH_TOKEN, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshExpiresIn,
      path: "/api/auth",
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
