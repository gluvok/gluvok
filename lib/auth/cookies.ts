/**
 * @file lib/auth/cookies.ts
 * @description Centralized cookie management utilities for authentication tokens.
 */

import { NextResponse } from "next/server";

export interface SetAuthCookiesParams {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

/**
 * Returns standard options for authentication cookies.
 */
export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

/**
 * Sets both access and refresh token cookies on a NextResponse.
 */
export function setAuthCookies<T extends NextResponse | Response>(
  response: T,
  tokens: SetAuthCookiesParams,
  sessionToken?: string,
): T {
  if ("cookies" in response && typeof response.cookies?.set === "function") {
    if (sessionToken) {
      response.cookies.set(
        "session_token",
        sessionToken,
        getAuthCookieOptions(tokens.refreshExpiresIn || 7 * 24 * 60 * 60),
      );
    }
    response.cookies.set("token", tokens.accessToken, getAuthCookieOptions(tokens.accessExpiresIn));
    response.cookies.set(
      "refresh_token",
      tokens.refreshToken,
      getAuthCookieOptions(tokens.refreshExpiresIn),
    );
  }
  return response;
}

/**
 * Clears all authentication token cookies (session_token, token, refresh_token) on a NextResponse.
 */
export function clearAuthCookies<T extends NextResponse | Response>(response: T): T {
  if ("cookies" in response && typeof response.cookies?.set === "function") {
    const clearOptions = getAuthCookieOptions(0);
    response.cookies.set("session_token", "", clearOptions);
    response.cookies.set("token", "", clearOptions);
    response.cookies.set("refresh_token", "", clearOptions);
  }
  return response;
}
