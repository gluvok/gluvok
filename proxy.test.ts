import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { CookieName, Role } from "@/lib/constants/enums";
import { signJWT, signRefreshToken } from "@/lib/auth/jwt";

describe("Next.js Middleware Proxy", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-12345";
  });

  it("passes through public route /login", async () => {
    const req = new NextRequest("http://localhost/login");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through static and internal next assets", async () => {
    const req = new NextRequest("http://localhost/_next/static/chunk.js");
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows access with valid access token and sets header attributes", async () => {
    const token = await signJWT({
      sub: "123",
      username: "admin_user",
      name: "Admin User",
      role: Role.ADMIN,
      factory_id: 5,
    });

    const req = new NextRequest("http://localhost/projects/centers");
    req.cookies.set(CookieName.TOKEN, token);

    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows page navigation without redirect when access token is expired but refresh token is valid", async () => {
    const refreshToken = await signRefreshToken({
      sub: "123",
      token_version: 1,
    });

    const req = new NextRequest("http://localhost/projects/centers");
    req.cookies.set(CookieName.TOKEN, "expired.or.invalid.token");
    req.cookies.set(CookieName.REFRESH_TOKEN, refreshToken);

    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("returns 401 for API routes when access token is expired even if refresh token is present (triggering client axios interceptor)", async () => {
    const refreshToken = await signRefreshToken({
      sub: "123",
      token_version: 1,
    });

    const req = new NextRequest("http://localhost/api/centers");
    req.cookies.set(CookieName.TOKEN, "expired.or.invalid.token");
    req.cookies.set(CookieName.REFRESH_TOKEN, refreshToken);

    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  it("redirects to /login on page requests when neither token nor refresh token is valid", async () => {
    const req = new NextRequest("http://localhost/projects/centers");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("returns 401 on API requests when neither token nor refresh token is valid", async () => {
    const req = new NextRequest("http://localhost/api/centers");
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });
});
