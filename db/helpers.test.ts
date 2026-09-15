import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants/enums";
import { validateSession } from "@/lib/auth/session";
import {
  fetchPaginatedResult,
  formatEntityResponse,
  parseBulkIds,
  withAuth,
  withEntityScope,
  isUniqueConstraintError,
  isCheckConstraintError,
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

vi.mock("@/lib/auth/session", () => ({
  validateSession: vi.fn(),
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
    name: "Admin",
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

describe("withAuth and session authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates and passes through when session token is valid", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const authedHandler = withAuth(handler);

    vi.mocked(validateSession).mockResolvedValue({
      sub: "1",
      username: "admin",
      name: "Admin",
      role: Role.ADMIN,
      factory_id: 1,
    });

    const req = new NextRequest("http://localhost/api/test");
    req.cookies.set("session_token", "mock-session-token");

    const response = await authedHandler(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("authenticates and passes through with forwarded x-user headers", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const authedHandler = withAuth(handler);

    const req = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-user-id": "1",
        "x-user-username": "admin",
        "x-user-name": "Admin",
        "x-user-role": Role.ADMIN,
        "x-user-factory-id": "1",
      },
    });

    const response = await authedHandler(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("returns 401 when session token is invalid or missing", async () => {
    vi.mocked(validateSession).mockResolvedValue(null);
    const handler = vi.fn();
    const authedHandler = withAuth(handler);

    const req = new NextRequest("http://localhost/api/test");
    const response = await authedHandler(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("isUniqueConstraintError", () => {
  it("identifies code 23505 as unique constraint error", () => {
    expect(isUniqueConstraintError({ code: "23505" })).toBe(true);
  });

  it("identifies error message mentioning unique constraint", () => {
    expect(
      isUniqueConstraintError({ message: "duplicate key value violates unique constraint" }),
    ).toBe(true);
  });

  it("returns false for non-unique errors or invalid inputs", () => {
    expect(isUniqueConstraintError({ code: "23503" })).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
    expect(isUniqueConstraintError("string error")).toBe(false);
  });
});

describe("isCheckConstraintError", () => {
  it("identifies code 23514 as check constraint error", () => {
    expect(isCheckConstraintError({ code: "23514" })).toBe(true);
  });

  it("identifies error message mentioning check constraint", () => {
    expect(
      isCheckConstraintError({ message: "new row violates check constraint 'chk_weight'" }),
    ).toBe(true);
  });

  it("returns false for non-check errors or invalid inputs", () => {
    expect(isCheckConstraintError({ code: "23505" })).toBe(false);
    expect(isCheckConstraintError(null)).toBe(false);
    expect(isCheckConstraintError(undefined)).toBe(false);
  });
});
