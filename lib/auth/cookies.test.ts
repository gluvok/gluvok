import { afterEach, describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  getAuthCookieOptions,
  setAuthCookies,
  clearAuthCookies,
  getSessionExpirySeconds,
  DEFAULT_PERMANENT_COOKIE_MAX_AGE,
} from "./cookies";

describe("Auth Cookie Helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("generates standard secure cookie options with specified maxAge", () => {
    const options = getAuthCookieOptions(300);
    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    });
  });

  it("sets session_token cookie on NextResponse with explicit maxAge", () => {
    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, "session-token-xyz", 604800);

    expect(res.cookies.get("session_token")?.value).toBe("session-token-xyz");
  });

  it("sets session_token cookie on NextResponse with default maxAge (permanent/400 days)", () => {
    delete process.env.SESSION_MAX_AGE_SECONDS;
    delete process.env.SESSION_EXPIRY_DAYS;

    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, "session-token-xyz");

    expect(res.cookies.get("session_token")?.value).toBe("session-token-xyz");
    expect(getSessionExpirySeconds()).toBe(DEFAULT_PERMANENT_COOKIE_MAX_AGE);
  });

  it("uses SESSION_MAX_AGE_SECONDS environment variable if set", () => {
    process.env.SESSION_MAX_AGE_SECONDS = "3600";
    expect(getSessionExpirySeconds()).toBe(3600);
  });

  it("uses SESSION_EXPIRY_DAYS environment variable if set", () => {
    delete process.env.SESSION_MAX_AGE_SECONDS;
    process.env.SESSION_EXPIRY_DAYS = "14";
    expect(getSessionExpirySeconds()).toBe(14 * 24 * 60 * 60);
  });

  it("clears all auth token cookies on NextResponse", () => {
    const res = NextResponse.json({ ok: true });
    clearAuthCookies(res);

    expect(res.cookies.get("session_token")?.value).toBe("");
    expect(res.cookies.get("token")?.value).toBe("");
    expect(res.cookies.get("refresh_token")?.value).toBe("");
  });
});
