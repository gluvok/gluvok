/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { validateSequentialApproval, tryMergeEntries } from "./weighments"
import { TableName, EntryStatus, Unit } from "@/lib/constants/enums"

describe("Weighments Service", () => {
  let mockClient: any

  beforeEach(() => {
    mockClient = {
      from: vi.fn(),
    }
  })

  describe("validateSequentialApproval", () => {
    it("should pass if no earlier pending entries exist for the vehicle", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      await expect(
        validateSequentialApproval(
          mockClient,
          1,
          "MH12AB1234",
          "2026-08-09T12:00:00Z",
          2
        )
      ).resolves.not.toThrow()
    })

    it("should throw an error if an earlier pending entry exists for the vehicle", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, created_at: "2026-08-09T10:00:00Z" },
          error: null,
        }),
      })

      await expect(
        validateSequentialApproval(
          mockClient,
          1,
          "MH12AB1234",
          "2026-08-09T12:00:00Z",
          2
        )
      ).rejects.toThrow(/earlier entry #1 .* is still pending/)
    })
  })

  describe("tryMergeEntries", () => {
    it("should return null if target entry is not approved", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 2, status: EntryStatus.PENDING },
          error: null,
        }),
      })

      const res = await tryMergeEntries(mockClient, 1, 2)
      expect(res).toBeNull()
    })

    it("should successfully merge entry E1 and E2 if E1 is unlinked and approved", async () => {
      const e2Data = {
        id: 2,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        created_at: "2026-08-09T14:00:00Z",
      }

      const e1Data = {
        id: 1,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        created_at: "2026-08-09T12:00:00Z",
      }

      let callCount = 0
      mockClient.from.mockImplementation((table: string) => {
        if (table === TableName.ENTRIES) {
          callCount++
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: e2Data, error: null }),
            }
          } else {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [e1Data], error: null }),
            }
          }
        }
        if (table === TableName.WEIGHMENTS) {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 100, in_entry_id: 1, out_entry_id: 2, unit: Unit.KG },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      const res = await tryMergeEntries(mockClient, 1, 2)
      expect(res).toEqual({ id: 100, in_entry_id: 1, out_entry_id: 2, unit: Unit.KG })
    })
  })
})
