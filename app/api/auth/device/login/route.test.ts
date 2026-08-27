import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { Role, RequestHeader } from "@/lib/constants/enums";
import { AuthErrorMessage } from "@/lib/constants/messages";
import { hashPassword } from "@/lib/auth/password";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    from: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

describe("POST /api/auth/device/login", () => {
  const defaultSecret = "default-pi-secret-key";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key-12345";
    process.env.MICROCONTROLLER_SECRET = defaultSecret;
  });

  it("rejects login with 401 when x-microcontroller-secret is missing", async () => {
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
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.INVALID_DEVICE_SECRET);
  });

  it("rejects login with 401 when x-microcontroller-secret is invalid", async () => {
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
      headers: {
        "Content-Type": "application/json",
        [RequestHeader.MICROCONTROLLER_SECRET]: "wrong-secret",
      },
      body: JSON.stringify({ username: "operator1", password: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.INVALID_DEVICE_SECRET);
  });

  it("rejects login with 401 when user role is BASE", async () => {
    const passwordHash = await hashPassword("password123");
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                username: "baseuser",
                name: "Base User",
                password_hash: passwordHash,
                role: Role.BASE,
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
      headers: {
        "Content-Type": "application/json",
        [RequestHeader.MICROCONTROLLER_SECRET]: defaultSecret,
      },
      body: JSON.stringify({ username: "baseuser", password: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe(AuthErrorMessage.INVALID_CREDENTIALS);
  });

  it("successfully returns access_token when device secret and credentials are valid", async () => {
    const passwordHash = await hashPassword("adminpass123");
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 1,
                username: "admin",
                name: "Admin User",
                password_hash: passwordHash,
                role: Role.ADMIN,
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
      headers: {
        "Content-Type": "application/json",
        [RequestHeader.MICROCONTROLLER_SECRET]: defaultSecret,
      },
      body: JSON.stringify({ username: "admin", password: "adminpass123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.access_token).toBeDefined();
    expect(json.user.role).toBe(Role.ADMIN);
  });
});
