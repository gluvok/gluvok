/**
 * @file lib/auth/device.ts
 * @description Authentication service for hardware scale devices.
 * Uses username and password credentials verifying the user has the 'hardware' role.
 */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants/messages";
import { verifyUserCredentials, generateAuthTokens } from "./common";

export async function authenticateDeviceUser(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    const { result, error, status } = await verifyUserCredentials(username, password);
    if (error || !result) {
      return NextResponse.json({ error }, { status: status ?? 401 });
    }

    const { user, userPayload } = result;

    if (user.role !== Role.HARDWARE) {
      return NextResponse.json({ error: AuthErrorMessage.FORBIDDEN }, { status: 403 });
    }

    const tokens = await generateAuthTokens(user);

    return NextResponse.json({
      success: true,
      user: userPayload,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: tokens.accessExpiresIn,
    });
  } catch (error) {
    console.error("Device authentication error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
