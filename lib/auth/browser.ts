/**
 * @file lib/auth/browser.ts
 * @description Dedicated browser authentication lifecycle managing session cookies and web sign-ins.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyUserCredentials, generateAuthTokens } from "./common";
import { setAuthCookies } from "./cookies";
import { AuthErrorMessage } from "@/lib/constants/messages";

export async function authenticateBrowserUser(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    const { result, error, status } = await verifyUserCredentials(username, password);
    if (error || !result) {
      return NextResponse.json({ error }, { status: status ?? 401 });
    }

    const { user, userPayload } = result;
    const tokens = await generateAuthTokens(user);

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
    console.error("Browser authentication error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
