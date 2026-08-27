import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { Role, CookieName } from "@/lib/constants/enums";
import { signRefreshToken } from "@/lib/auth/jwt";

const { mockCookies, mockDb } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockDb: {
    from: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key-12345";
  });

  it("returns 401 when no refresh token is present in cookie or body", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 401 when refresh token is invalid or corrupted", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "corrupted.token.value" }),
    });

    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when token_version in database is different (password changed)", async () => {
    const refreshToken = await signRefreshToken({
      sub: "10",
      token_version: 1,
    });

    mockCookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === CookieName.REFRESH_TOKEN) return { value: refreshToken };
        return undefined;
      }),
    });

    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 10,
                username: "operator_01",
                role: Role.OPERATOR,
                factory_id: 1,
                token_version: 2, // Version incremented to 2 on password change!
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is deleted or not found", async () => {
    const refreshToken = await signRefreshToken({
      sub: "10",
      token_version: 1,
    });

    mockCookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === CookieName.REFRESH_TOKEN) return { value: refreshToken };
        return undefined;
      }),
    });

    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("issues new tokens and returns 200 when token_version matches", async () => {
    const refreshToken = await signRefreshToken({
      sub: "10",
      token_version: 1,
    });

    mockCookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === CookieName.REFRESH_TOKEN) return { value: refreshToken };
        return undefined;
      }),
    });

    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 10,
                username: "operator_01",
                role: Role.OPERATOR,
                factory_id: 1,
                token_version: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user).toEqual({
      id: 10,
      username: "operator_01",
      role: Role.OPERATOR,
      factory_id: 1,
    });
    expect(json.access_token).toBeDefined();
    expect(json.refresh_token).toBeDefined();
  });
});
