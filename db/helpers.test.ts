import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { sharedSchema } from "@/db/schema";
import { TenantMode } from "@/lib/constants/enums";
import {
  fetchPaginatedResult,
  formatEntityResponse,
  getScopedEntityWhereClause,
  parseBulkIds,
  withEntityScope,
} from "./helpers";

describe("fetchPaginatedResult", () => {
  it("applies ordering before pagination", async () => {
    const calls: string[] = [];
    const rows = [{ id: 2 }, { id: 1 }];
    const orderByClause = { name: "name" };

    const baseQuery = {
      orderBy: (clause: unknown) => {
        calls.push(`orderBy:${clause === orderByClause}`);
        return {
          where: () => {
            calls.push("where");
            return {
              limit: (limit: number) => {
                calls.push(`limit:${limit}`);
                return {
                  offset: async (offset: number) => {
                    calls.push(`offset:${offset}`);
                    return rows;
                  },
                };
              },
            };
          },
        };
      },
    };

    const countQuery = {
      where: async () => [{ count: 2 }],
    };

    const response = await fetchPaginatedResult(
      {} as never,
      countQuery,
      baseQuery,
      undefined,
      { page: 1, limit: 10, offset: 0 },
      orderByClause,
    );

    expect(calls).toEqual(["orderBy:true", "where", "limit:10", "offset:0"]);
    expect(await response.json()).toEqual({
      data: rows,
      pagination: { page: 1, limit: 10, total: 2 },
    });
  });
});

describe("withEntityScope", () => {
  const sharedUser = {
    sub: "1",
    username: "admin",
    role: "admin",
    factory_id: 1,
    tenant_mode: TenantMode.SHARED,
  };

  it("rejects invalid IDs and shared users without a factory before calling the handler", async () => {
    const handler = vi.fn();
    const scopedHandler = withEntityScope(
      () => sharedSchema.centers,
      sharedSchema.centers.factoryId,
      handler,
    );

    const invalidResponse = await scopedHandler(
      new Request("http://localhost") as never,
      sharedUser,
      {} as never,
      TenantMode.SHARED,
      { params: Promise.resolve({ id: "invalid" }) },
    );
    const forbiddenResponse = await scopedHandler(
      new Request("http://localhost") as never,
      { ...sharedUser, factory_id: null },
      {} as never,
      TenantMode.SHARED,
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(invalidResponse.status).toBe(400);
    expect(forbiddenResponse.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("getScopedEntityWhereClause", () => {
  const entityWhereClause = eq(sharedSchema.centers.id, 1);
  const sharedUser = {
    sub: "1",
    username: "admin",
    role: "admin",
    factory_id: 1,
    tenant_mode: TenantMode.SHARED,
  };

  it("requires a factory assignment in shared mode", () => {
    expect(
      getScopedEntityWhereClause(
        { ...sharedUser, factory_id: null },
        TenantMode.SHARED,
        entityWhereClause,
        sharedSchema.centers.factoryId,
      ),
    ).toBeNull();
  });

  it("adds factory scope in shared mode and preserves dedicated mode predicates", () => {
    expect(
      getScopedEntityWhereClause(
        sharedUser,
        TenantMode.SHARED,
        entityWhereClause,
        sharedSchema.centers.factoryId,
      ),
    ).not.toBeNull();
    expect(
      getScopedEntityWhereClause(
        sharedUser,
        TenantMode.DEDICATED,
        entityWhereClause,
        sharedSchema.centers.factoryId,
      ),
    ).toBe(entityWhereClause);
  });
});

describe("formatEntityResponse", () => {
  it("preserves profile response fields, converts database keys, and omits password hashes", async () => {
    const response = formatEntityResponse(
      {
        id: 1,
        userId: "user-1",
        username: "operator",
        factoryId: 7,
        isActive: false,
        passwordHash: "secret",
      },
      TenantMode.SHARED,
    );

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
