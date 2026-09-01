/**
 * @file lib/auth/login.ts
 * @description Unified authentication handler supporting browser cookie sessions and hardware Bearer tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants/messages";
import { verifyUserCredentials, generateAuthTokens } from "./common";
import { setAuthCookies } from "./cookies";

/**
 * Authenticates a user with username and password.
 * - For Role.HARDWARE: returns Bearer tokens in JSON response for IoT device authorization.
 * - For other roles: sets secure HTTP-only cookies and returns user profile payload.
 */
export async function authenticateUser(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    const { result, error, status } = await verifyUserCredentials(username, password);
    if (error || !result) {
      return NextResponse.json({ error }, { status: status ?? 401 });
    }

    const { user, userPayload } = result;
    const tokens = await generateAuthTokens(user);

    if (user.role === Role.HARDWARE) {
      return NextResponse.json({
        success: true,
        user: userPayload,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: "Bearer",
        expires_in: tokens.accessExpiresIn,
      });
    }

    const response = NextResponse.json({
      success: true,
      user: userPayload,
    });

    return setAuthCookies(response, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
