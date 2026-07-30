import { describe, expect, it } from "vitest"
import { eq } from "drizzle-orm";
import { sharedSchema } from "@/db/schema";
import { TenantMode } from "@/lib/constants/enums";
import {
  fetchPaginatedResult,
  formatEntityResponse,
  getScopedEntityWhereClause,
} from "./helpers";

describe("fetchPaginatedResult", () => {
  it("applies ordering before pagination", async () => {
    const calls: string[] = []
    const rows = [{ id: 2 }, { id: 1 }]
    const orderByClause = { name: "name" }

    const baseQuery = {
      orderBy: (clause: unknown) => {
        calls.push(`orderBy:${clause === orderByClause}`)
        return {
          where: () => {
            calls.push("where")
            return {
              limit: (limit: number) => {
                calls.push(`limit:${limit}`)
                return {
                  offset: async (offset: number) => {
                    calls.push(`offset:${offset}`)
                    return rows
                  },
                }
              },
            }
          },
        }
      },
    }

    const countQuery = {
      where: async () => [{ count: 2 }],
    }

    const response = await fetchPaginatedResult(
      {} as never,
      countQuery,
      baseQuery,
      undefined,
      { page: 1, limit: 10, offset: 0 },
      orderByClause,
    )

    expect(calls).toEqual(["orderBy:true", "where", "limit:10", "offset:0"])
    expect(await response.json()).toEqual({
      data: rows,
      pagination: { page: 1, limit: 10, total: 2 },
    })
  })
})

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
    )

    expect(await response.json()).toEqual({
      data: {
        id: 1,
        user_id: "user-1",
        username: "operator",
        factory_id: 7,
        is_active: false,
      },
    })
  })
})
