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

  it("sets both access and refresh token cookies on NextResponse", () => {
    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, {
      accessToken: "access-token-xyz",
      refreshToken: "refresh-token-abc",
      accessExpiresIn: 300,
      refreshExpiresIn: 604800,
    });

    expect(res.cookies.get("token")?.value).toBe("access-token-xyz");
    expect(res.cookies.get("refresh_token")?.value).toBe("refresh-token-abc");
  });

  it("clears all auth token cookies on NextResponse", () => {
    const res = NextResponse.json({ ok: true });
    clearAuthCookies(res);

    expect(res.cookies.get("token")?.value).toBe("");
    expect(res.cookies.get("refresh_token")?.value).toBe("");
  });
});
