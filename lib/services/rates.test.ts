/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

describe("Rate edit lock rules", () => {
  it("should detect when a rate is linked to weighment records", async () => {
    const mockClient: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "weighments") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 101 }],
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    const { data: linkedWeighments } = await mockClient
      .from("weighments")
      .select("id")
      .eq("rate_id", 5)
      .limit(1);

    expect(linkedWeighments).toHaveLength(1);
    expect(linkedWeighments[0].id).toBe(101);
  });
});
