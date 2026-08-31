import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { Role } from "@/lib/constants/enums";
import { signJWT, signRefreshToken } from "@/lib/auth/jwt";

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
  supabase: mockDb,
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key-12345";
  });

  it("returns user when valid access token is provided", async () => {
    const token = await signJWT({
      sub: "10",
      username: "operator_01",
      name: "Operator One",
      role: Role.OPERATOR,
      factory_id: 1,
    });

    mockCookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === "token") return { value: token };
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
                name: "Operator One",
                role: Role.OPERATOR,
                factory_id: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.user).toEqual({
      id: 10,
      username: "operator_01",
      name: "Operator One",
      role: Role.OPERATOR,
      factory_id: 1,
    });
  });

  it("self-heals and returns user when access token is expired but refresh token is valid", async () => {
    const refreshToken = await signRefreshToken({
      sub: "10",
      token_version: 1,
    });

    mockCookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === "token") return { value: "invalid.or.expired.token" };
        if (name === "refresh_token") return { value: refreshToken };
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
                name: "Operator One",
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

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.user).toEqual({
      id: 10,
      username: "operator_01",
      name: "Operator One",
      role: Role.OPERATOR,
      factory_id: 1,
      factory_name: undefined,
    });
  });

  it("returns user: null when neither access token nor refresh token is valid", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.user).toBeNull();
  });
});
