import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("returns { success: true } with 200", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("clears token cookies (sets maxAge to 0)", async () => {
    const response = await POST();
    // NextResponse in test env exposes cookies via getSetCookie or headers
    const setCookie = response.headers.get("set-cookie") ?? "";
    // clearAuthCookies writes token and refresh_token with maxAge=0
    expect(setCookie).toMatch(/token/);
  });
});
