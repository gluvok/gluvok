/**
 * @file app/api/auth/refresh/route.ts
 * @description API route to refresh access tokens using a valid refresh token.
 * Validates token_version against the database to enforce session invalidation on password changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
import { fetchActiveUserById, generateAuthTokens, toUserSessionPayload } from "@/lib/auth/common";
import { AuthErrorMessage } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let refreshToken = cookieStore.get("refresh_token")?.value;

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

    const user = await fetchActiveUserById(idNumber);
    if (!user || user.token_version !== payload.token_version) {
      const response = NextResponse.json(
        { error: AuthErrorMessage.INVALID_CREDENTIALS },
        { status: 401 },
      );
      return clearAuthCookies(response);
    }

    const tokens = await generateAuthTokens(user);
    const userPayload = toUserSessionPayload(user);

    const response = NextResponse.json({
      success: true,
      user: userPayload,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: tokens.expiresIn,
    });

    return setAuthCookies(response, tokens);
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
