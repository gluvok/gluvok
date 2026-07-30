import { describe, expect, it } from "vitest"
import { fetchPaginatedResult } from "./helpers"

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
