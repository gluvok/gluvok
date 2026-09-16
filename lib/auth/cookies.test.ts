import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  getAuthCookieOptions,
  setAuthCookies,
  clearAuthCookies,
  SESSION_MAX_AGE_SECONDS,
} from "./cookies";

describe("Auth Cookie Helpers", () => {
  it("exports 400-day SESSION_MAX_AGE_SECONDS constant", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(400 * 24 * 60 * 60);
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

  it("generates default cookie options using SESSION_MAX_AGE_SECONDS", () => {
    const options = getAuthCookieOptions();
    expect(options.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it("sets session_token cookie on NextResponse with explicit maxAge", () => {
    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, "session-token-xyz", 604800);

    expect(res.cookies.get("session_token")?.value).toBe("session-token-xyz");
  });

  it("sets session_token cookie on NextResponse with default SESSION_MAX_AGE_SECONDS", () => {
    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, "session-token-xyz");

    expect(res.cookies.get("session_token")?.value).toBe("session-token-xyz");
  });

  it("clears all auth token cookies on NextResponse", () => {
    const res = NextResponse.json({ ok: true });
    clearAuthCookies(res);

    expect(res.cookies.get("session_token")?.value).toBe("");
    expect(res.cookies.get("token")?.value).toBe("");
    expect(res.cookies.get("refresh_token")?.value).toBe("");
  });
});
