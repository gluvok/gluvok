/**
 * @file lib/auth/login.ts
 * @description Authentication handler for browser sessions and human user tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthErrorMessage } from "@/lib/constants/messages";
import { verifyUserCredentials, generateAuthTokens } from "./common";
import { setAuthCookies } from "./cookies";

/**
 * Authenticates a user with username and password, sets secure HTTP-only cookies and returns user profile payload.
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

    // Create a database-backed session for immediate revocation and edge device access
    const { createSession } = await import("./session");
    const session = await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: userPayload,
      token: session.token,
      session_id: session.id,
    });

    return setAuthCookies(
      response,
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: tokens.expiresIn,
        refreshExpiresIn: tokens.refreshExpiresIn,
      },
      session.token,
    );
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
