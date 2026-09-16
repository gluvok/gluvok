/**
 * @file lib/auth/cookies.ts
 * @description Centralized cookie management utilities for authentication session tokens.
 */

import { NextResponse } from "next/server";

// 400 days in seconds (34,560,000s) — standard RFC 6265bis maximum allowed by modern browser engines
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * Returns standard options for authentication cookies.
 */
export function getAuthCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

/**
 * Sets the database session_token cookie on a NextResponse.
 */
export function setAuthCookies<T extends NextResponse | Response>(
  response: T,
  sessionToken: string,
  maxAge: number = SESSION_MAX_AGE_SECONDS,
): T {
  if ("cookies" in response && typeof response.cookies?.set === "function") {
    response.cookies.set("session_token", sessionToken, getAuthCookieOptions(maxAge));
  }
  return response;
}

/**
 * Clears authentication session cookies on a NextResponse (including legacy token cookies).
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
