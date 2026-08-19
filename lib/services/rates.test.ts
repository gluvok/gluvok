/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest"
import { TableName, EntityKey } from "@/lib/constants/enums"

describe("Rate edit lock rules", () => {
  it("should detect when a rate is linked to weighment records", async () => {
    const mockClient: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === TableName.WEIGHMENTS) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ [EntityKey.ID]: 101 }],
              error: null,
            }),
          }
        }
        return {}
      }),
    }

    const { data: linkedWeighments } = await mockClient
      .from(TableName.WEIGHMENTS)
      .select(EntityKey.ID)
      .eq(EntityKey.RATE_ID, 5)
      .limit(1)

    expect(linkedWeighments).toHaveLength(1)
    expect(linkedWeighments[0][EntityKey.ID]).toBe(101)
  })
})
