/**
 * @file app/api/auth/refresh/route.ts
 * @description API route to refresh access tokens using a valid refresh token.
 * Validates token_version against the database to enforce session invalidation on password changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { getTokenExpiresIn, signJWT, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
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

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearAuthCookies(response);
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearAuthCookies(response);
    }

    const idNumber = parseInt(payload.sub, 10);
    if (isNaN(idNumber)) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearAuthCookies(response);
    }

    const { data: user, error: userError } = await db
      .from(TableName.USERS)
      .select("*")
      .eq(EntityKey.ID, idNumber)
      .is(EntityKey.DELETED_AT, null)
      .maybeSingle();

    if (userError || !user || user.token_version !== payload.token_version) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearAuthCookies(response);
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
      token_version: user.token_version,
    });
    const refreshExpiresIn = getTokenExpiresIn(newRefreshToken);

    const userPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      aadhar_number: user.aadhar_number ?? null,
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

    return setAuthCookies(response, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessExpiresIn,
      refreshExpiresIn,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
