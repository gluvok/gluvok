import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { getAuthCookieOptions, setAuthCookies, clearAuthCookies } from "./cookies";

describe("Auth Cookie Helpers", () => {
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

  it("sets session_token cookie on NextResponse", () => {
    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, "session-token-xyz", 604800);

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
