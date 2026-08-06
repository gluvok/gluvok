import { describe, expect, it, vi } from "vitest";
import { Role } from "@/lib/constants/enums";
import {
  fetchPaginatedResult,
  formatEntityResponse,
  parseBulkIds,
  withEntityScope,
} from "./helpers";

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
      { params: Promise.resolve({ id: "invalid" }) }
    );

    expect(invalidResponse.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes entityId and factoryId to handler for valid IDs", async () => {
    const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const scopedHandler = withEntityScope(handler);

    const validResponse = await scopedHandler(
      new Request("http://localhost") as never,
      sampleUser,
      {} as never,
      { params: Promise.resolve({ id: "5" }) }
    );

    expect(validResponse.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      sampleUser,
      expect.anything(),
      expect.anything(),
      { entityId: 5, factoryId: 1 }
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
      is_active: false,
      password_hash: "secret",
    });

    expect(await response.json()).toEqual({
      data: {
        id: 1,
        user_id: "user-1",
        username: "operator",
        factory_id: 7,
        is_active: false,
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
