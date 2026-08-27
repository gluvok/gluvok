import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Role, CookieName } from "@/lib/constants/enums";
import { signJWT, signRefreshToken } from "@/lib/auth/jwt";
import {
  fetchPaginatedResult,
  formatEntityResponse,
  parseBulkIds,
  withAuth,
  withEntityScope,
} from "./helpers";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    from: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
  supabase: mockDb,
}));

describe("fetchPaginatedResult", () => {
  it("applies range pagination and returns standard payload", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const query = {
      range: async (start: number, end: number) => {
        return {
          data: rows.slice(start, end + 1),
          count: rows.length,
          error: null,
        };
      },
    };

    const response = await fetchPaginatedResult(query, {
      page: 1,
      limit: 10,
      offset: 0,
    });

    expect(await response.json()).toEqual({
      data: rows,
      pagination: { page: 1, limit: 10, total: 2 },
    });
  });
});

describe("withEntityScope", () => {
  const sampleUser = {
    sub: "1",
    username: "admin",
    role: Role.ADMIN,
    factory_id: 1,
  };

  it("rejects invalid IDs before calling handler", async () => {
    const handler = vi.fn();
    const scopedHandler = withEntityScope(handler);

    const invalidResponse = await scopedHandler(
      new Request("http://localhost") as never,
      sampleUser,
      {} as never,
      { params: Promise.resolve({ id: "invalid" }) },
    );

    expect(invalidResponse.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes entityId and factoryId to handler for valid IDs", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const scopedHandler = withEntityScope(handler);

    const validResponse = await scopedHandler(
      new Request("http://localhost") as never,
      sampleUser,
      {} as never,
      { params: Promise.resolve({ id: "5" }) },
    );

    expect(validResponse.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      sampleUser,
      expect.anything(),
      expect.anything(),
      { entityId: 5, factoryId: 1 },
    );
  });
});

describe("formatEntityResponse", () => {
  it("omits password hashes and formats entity response", async () => {
    const response = formatEntityResponse({
      id: 1,
      user_id: "user-1",
      username: "operator",
      factory_id: 7,
      password_hash: "secret",
    });

    expect(await response.json()).toEqual({
      data: {
        id: 1,
        user_id: "user-1",
        username: "operator",
        factory_id: 7,
      },
    });
  });
});

describe("parseBulkIds", () => {
  it("accepts bounded, unique positive integer ID batches", () => {
    expect(parseBulkIds({ ids: [1, "2", 2, 3] })).toEqual([1, 2, 3]);
  });

  it.each([
    undefined,
    {},
    { ids: [] },
    { ids: [0] },
    { ids: [1.5] },
    { ids: Array.from({ length: 101 }, (_, index) => index + 1) },
  ])("rejects invalid batches", (body) => {
    expect(parseBulkIds(body)).toBeNull();
  });
});

describe("withAuth and server-side auto-refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key-12345";
  });

  it("authenticates and passes through when access token is valid", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const authedHandler = withAuth(handler);

    const token = await signJWT({
      sub: "1",
      username: "admin",
      role: Role.ADMIN,
      factory_id: 1,
    });

    const req = new NextRequest("http://localhost/api/test");
    req.cookies.set(CookieName.TOKEN, token);

    const response = await authedHandler(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("silently auto-refreshes when access token is expired but refresh token is valid", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const authedHandler = withAuth(handler);

    const refreshToken = await signRefreshToken({
      sub: "10",
      token_version: 1,
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
                factory_id: 2,
                token_version: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/test");
    req.cookies.set(CookieName.TOKEN, "expired.or.invalid.token");
    req.cookies.set(CookieName.REFRESH_TOKEN, refreshToken);

    const response = await authedHandler(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
    expect(response.cookies.get(CookieName.TOKEN)?.value).toBeDefined();
    expect(response.cookies.get(CookieName.REFRESH_TOKEN)?.value).toBeDefined();
  });

  it("returns 401 when neither token nor refresh token is valid", async () => {
    const handler = vi.fn();
    const authedHandler = withAuth(handler);

    const req = new NextRequest("http://localhost/api/test");
    const response = await authedHandler(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
