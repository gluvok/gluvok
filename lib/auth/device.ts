/**
 * @file lib/auth/device.ts
 * @description Dedicated hardware microcontroller authentication lifecycle (secret verification, Bearer tokens, zero cookies).
 */

import { NextRequest, NextResponse } from "next/server";
import { validateDeviceSecret } from "@/db/helpers";
import { Role } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants/messages";
import { verifyUserCredentials, generateAuthTokens } from "./common";

export async function authenticateDeviceUser(request: NextRequest): Promise<NextResponse> {
  try {
    if (!validateDeviceSecret(request)) {
      return NextResponse.json({ error: AuthErrorMessage.INVALID_DEVICE_SECRET }, { status: 401 });
    }

    const body = await request.json();
    const { username, password } = body || {};

    const { result, error, status } = await verifyUserCredentials(username, password);
    if (error || !result) {
      return NextResponse.json({ error }, { status: status ?? 401 });
    }

    const { user, userPayload } = result;

    if (user.role === Role.BASE) {
      return NextResponse.json({ error: AuthErrorMessage.INVALID_CREDENTIALS }, { status: 401 });
    }

    const tokens = await generateAuthTokens(user);

    return NextResponse.json({
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: tokens.expiresIn,
      user_id: user.id,
      user: userPayload,
    });
  } catch (error) {
    console.error("Device authentication error:", error);
    return NextResponse.json({ error: AuthErrorMessage.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
