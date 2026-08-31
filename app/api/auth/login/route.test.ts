import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { Role } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants/messages";
import { hashPassword } from "@/lib/auth/password";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    from: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
  supabase: mockDb,
}));

describe("POST /api/auth/login (Browser Authentication)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key-12345";
  });

  it("authenticates browser user successfully and attaches session cookies", async () => {
    const passwordHash = await hashPassword("password123");
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                username: "admin1",
                name: "Admin User",
                password_hash: passwordHash,
                role: Role.ADMIN,
                factory_id: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin1", password: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user).toEqual({
      id: 1,
      username: "admin1",
      name: "Admin User",
      role: Role.ADMIN,
      factory_id: 1,
      factory_name: undefined,
    });

    // Verify tokens are not leaked in body
    expect(json.access_token).toBeUndefined();
    expect(json.refresh_token).toBeUndefined();

    // Verify session cookies are set
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toContain("token=");
    expect(setCookieHeader).toContain("refresh_token=");
  });

  it("rejects login with 400 when credentials are missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.REQUIRED_FIELDS);
  });

  it("rejects login with 401 when user does not exist", async () => {
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

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "unknown_user", password: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.INVALID_CREDENTIALS);
  });

  it("rejects login with 401 when password is invalid", async () => {
    const passwordHash = await hashPassword("correct_password");
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                username: "admin1",
                name: "Admin User",
                password_hash: passwordHash,
                role: Role.ADMIN,
                factory_id: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin1", password: "wrong_password" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.INVALID_CREDENTIALS);
  });
});
