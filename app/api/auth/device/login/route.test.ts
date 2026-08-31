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

describe("POST /api/auth/device/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key-12345";
  });

  it("rejects login with 400 when credentials are missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/device/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "" }),
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

    const req = new NextRequest("http://localhost/api/auth/device/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "unknown_hw", password: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.INVALID_CREDENTIALS);
  });

  it("rejects login with 403 when user role is not HARDWARE", async () => {
    const passwordHash = await hashPassword("password123");
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                username: "operator1",
                name: "Operator One",
                password_hash: passwordHash,
                role: Role.OPERATOR,
                factory_id: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/device/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "operator1", password: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.FORBIDDEN);
  });

  it("successfully returns access_token when hardware credentials are valid", async () => {
    const passwordHash = await hashPassword("hardwarepass123");
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 5,
                username: "hardware_unit_1",
                name: "Hardware Unit 1",
                password_hash: passwordHash,
                role: Role.HARDWARE,
                factory_id: 1,
                token_version: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/auth/device/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "hardware_unit_1", password: "hardwarepass123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.access_token).toBeDefined();
    expect(json.user.role).toBe(Role.HARDWARE);
  });
});
