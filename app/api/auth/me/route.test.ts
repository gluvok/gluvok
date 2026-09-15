import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { Role } from "@/lib/constants/enums";
import { validateSession } from "@/lib/auth/session";

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

vi.mock("@/lib/auth/session", () => ({
  validateSession: vi.fn(),
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when valid session token is provided", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === "session_token") return { value: "valid-session-token" };
        return undefined;
      }),
    });

    vi.mocked(validateSession).mockResolvedValue({
      sub: "10",
      username: "operator_01",
      name: "Operator One",
      role: Role.OPERATOR,
      factory_id: 1,
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
      factory_name: undefined,
    });
  });

  it("returns user: null when session token is invalid or expired", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === "session_token") return { value: "invalid-token" };
        return undefined;
      }),
    });

    vi.mocked(validateSession).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.user).toBeNull();
  });

  it("returns user: null when no cookies are provided", async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.user).toBeNull();
  });
});
