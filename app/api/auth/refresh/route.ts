/**
 * @file app/api/auth/refresh/route.ts
 * @description API route to refresh access tokens using a valid refresh token.
 * Validates token_version against the database to enforce session invalidation on password changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { getTokenExpiresIn, signJWT, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { AuthErrorMessage, CookieName, EntityKey, TableName } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let refreshToken = cookieStore.get(CookieName.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
      try {
        const body = await request.json();
        if (body && typeof body.refresh_token === "string") {
          refreshToken = body.refresh_token;
        }
      } catch {
        // No JSON body
      }
    }

    if (!refreshToken) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        refreshToken = authHeader.substring(7);
      }
    }

    const clearCookies = (response: NextResponse) => {
      const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        expires: new Date(0),
        path: "/",
      };
      response.cookies.set(CookieName.TOKEN, "", clearOptions);
      response.cookies.set(CookieName.AUTH_TOKEN, "", clearOptions);
      response.cookies.set(CookieName.REFRESH_TOKEN, "", clearOptions);
      return response;
    };

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearCookies(response);
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearCookies(response);
    }

    const userId = parseInt(payload.sub, 10);
    if (isNaN(userId)) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearCookies(response);
    }

    const { data: user, error: userError } = await db
      .from(TableName.USERS)
      .select("*")
      .eq(EntityKey.ID, userId)
      .is(EntityKey.DELETED_AT, null)
      .maybeSingle();

    const currentTokenVersion =
      user && typeof user.token_version === "number" ? user.token_version : 1;

    if (userError || !user || currentTokenVersion !== payload.token_version) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearCookies(response);
    }

    const factoryId = user.factory_id;

    const newAccessToken = await signJWT({
      sub: String(user.id),
      username: user.username,
      name: user.name,
      role: user.role,
      factory_id: factoryId,
    });
    const accessExpiresIn = getTokenExpiresIn(newAccessToken);

    const newRefreshToken = await signRefreshToken({
      sub: String(user.id),
      token_version: currentTokenVersion,
    });
    const refreshExpiresIn = getTokenExpiresIn(newRefreshToken);

    const userPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      factory_id: factoryId,
    };

    const response = NextResponse.json({
      success: true,
      user: userPayload,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: accessExpiresIn,
    });

    response.cookies.set(CookieName.TOKEN, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: accessExpiresIn,
      path: "/",
    });

    response.cookies.set(CookieName.REFRESH_TOKEN, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshExpiresIn,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
