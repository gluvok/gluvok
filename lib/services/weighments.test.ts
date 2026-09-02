import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  validateSequentialApproval,
  tryMergeEntries,
  formatWeighmentRecord,
  deleteWeighments,
} from "./weighments";
import { EntryStatus, EntrySource, Unit } from "@/lib/constants/enums";
import type { supabase } from "@/db";

type MockSupabaseClient = typeof supabase & {
  from: Mock;
};

describe("Weighments Service", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = {
      from: vi.fn(),
    } as unknown as MockSupabaseClient;
  });

  describe("validateSequentialApproval", () => {
    it("should pass if no earlier pending entries exist for the vehicle in the same center", async () => {
      const eqMock = vi.fn().mockReturnThis();
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
        lt: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        validateSequentialApproval(
          mockClient,
          1,
          "MH12AB1234",
          "2026-08-09T14:00:00Z",
          2,
          EntrySource.DEVICE,
        ),
      ).resolves.toBeUndefined();

      expect(mockClient.from).toHaveBeenCalledWith("entries");
      expect(eqMock).toHaveBeenCalledWith("center_id", 1);
      expect(eqMock).toHaveBeenCalledWith("vehicle_number", "MH12AB1234");
      expect(eqMock).toHaveBeenCalledWith("status", EntryStatus.PENDING);
      expect(eqMock).toHaveBeenCalledWith("source", EntrySource.DEVICE);
    });

    it("should throw an error if an earlier pending entry exists for the vehicle in the same center", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            created_at: "2026-08-09T12:00:00Z",
            source: EntrySource.DEVICE,
          },
          error: null,
        }),
      });

      await expect(
        validateSequentialApproval(
          mockClient,
          1,
          "MH12AB1234",
          "2026-08-09T14:00:00Z",
          2,
          EntrySource.DEVICE,
        ),
      ).rejects.toThrow(
        /Cannot approve entry #2 because earlier device entry #1/,
      );
    });
  });

  describe("tryMergeEntries", () => {
    it("should merge two entries of the same source and vehicle into a weighment when check_center_on_merge is false", async () => {
      const e2Data = {
        id: 2,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        created_at: "2026-08-09T14:00:00Z",
        center_id: 10,
      };
      const e1Data = {
        id: 1,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        created_at: "2026-08-09T12:00:00Z",
        center_id: 20, // different center
      };

      let entriesCallCount = 0;
      const eqMock = vi.fn().mockReturnThis();

      mockClient.from.mockImplementation((table: string) => {
        if (table === "factories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { check_center_on_merge: false },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "entries") {
          entriesCallCount++;
          if (entriesCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: e2Data, error: null }),
            };
          } else {
            return {
              select: vi.fn().mockReturnThis(),
              eq: eqMock,
              lt: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [e1Data], error: null }),
            };
          }
        }
        if (table === "weighments") {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 100,
                    in_entry_id: 1,
                    out_entry_id: 2,
                    unit: Unit.KG,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const res = await tryMergeEntries(mockClient, 1, 2);
      expect(res).toEqual({
        id: 100,
        in_entry_id: 1,
        out_entry_id: 2,
        unit: Unit.KG,
      });
      // Should NOT filter by center_id when check_center_on_merge is false
      expect(eqMock).not.toHaveBeenCalledWith("center_id", 10);
    });

    it("should filter by center_id when check_center_on_merge is true", async () => {
      const e2Data = {
        id: 2,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        created_at: "2026-08-09T14:00:00Z",
        center_id: 10,
      };
      const e1Data = {
        id: 1,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        created_at: "2026-08-09T12:00:00Z",
        center_id: 10, // matching center
      };

      let entriesCallCount = 0;
      const eqMock = vi.fn().mockReturnThis();

      mockClient.from.mockImplementation((table: string) => {
        if (table === "factories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { check_center_on_merge: true },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "entries") {
          entriesCallCount++;
          if (entriesCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: e2Data, error: null }),
            };
          } else {
            return {
              select: vi.fn().mockReturnThis(),
              eq: eqMock,
              lt: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [e1Data], error: null }),
            };
          }
        }
        if (table === "weighments") {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 100,
                    in_entry_id: 1,
                    out_entry_id: 2,
                    unit: Unit.KG,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const res = await tryMergeEntries(mockClient, 1, 2);
      expect(res).toEqual({
        id: 100,
        in_entry_id: 1,
        out_entry_id: 2,
        unit: Unit.KG,
      });
      // Should filter by center_id when check_center_on_merge is true
      expect(eqMock).toHaveBeenCalledWith("center_id", 10);
    });

    it("should return null if no matching entry of the same source is found", async () => {
      const e2Data = {
        id: 2,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        source: EntrySource.MANUAL,
        created_at: "2026-08-09T14:00:00Z",
        center_id: 10,
      };

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "factories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { check_center_on_merge: false },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "entries") {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: e2Data, error: null }),
            };
          } else {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              gt: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
        }
        if (table === "weighments") {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      const res = await tryMergeEntries(mockClient, 1, 2);
      expect(res).toBeNull();
    });

    it("should merge with a later unmerged entry (forward merge) when no earlier entry exists", async () => {
      const e1Data = {
        id: 1,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        created_at: "2026-08-09T10:00:00Z",
        center_id: 10,
      };
      const e2Data = {
        id: 2,
        vehicle_number: "MH12AB1234",
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        created_at: "2026-08-09T12:00:00Z",
        center_id: 10,
      };

      let entriesCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === "factories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { check_center_on_merge: false },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "entries") {
          entriesCallCount++;
          if (entriesCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: e1Data, error: null }),
            };
          } else if (entriesCallCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              lt: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          } else {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              gt: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [e2Data], error: null }),
            };
          }
        }
        if (table === "weighments") {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 101,
                    in_entry_id: 1,
                    out_entry_id: 2,
                    unit: Unit.KG,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const res = await tryMergeEntries(mockClient, 1, 1);
      expect(res).toEqual({
        id: 101,
        in_entry_id: 1,
        out_entry_id: 2,
        unit: Unit.KG,
      });
    });
  });

  describe("formatWeighmentRecord", () => {
    it("correctly formats weighment with rate_id, center, weights, and timestamps", () => {
      const mockRow = {
        id: 10,
        unit: Unit.KG,
        type: "unassigned",
        rate_id: 7,
        in_entry_id: 1,
        out_entry_id: 2,
        created_at: "2026-08-31T10:00:00Z",
        updated_at: "2026-08-31T10:00:00Z",
        in_entry: {
          created_at: "2026-08-31T08:00:00Z",
          weight: 40000,
          vehicle_number: "KA01AB1234",
          center_id: 1,
          centers: { name: "Center A" },
          user_id: 2,
          users: { name: "Operator 1" },
          customer_id: 3,
          customers: { name: "Customer 1" },
          images: ["img1.jpg"],
        },
        out_entry: {
          created_at: "2026-08-31T10:00:00Z",
          weight: 15000,
          vehicle_number: "KA01AB1234",
          center_id: 1,
          centers: { name: "Center A" },
          user_id: 4,
          users: { name: "Operator 2" },
          customer_id: 3,
          customers: { name: "Customer 1" },
          images: ["img2.jpg"],
        },
      };

      const result = formatWeighmentRecord(mockRow);
      expect(result).toEqual({
        id: 10,
        unit: Unit.KG,
        type: "unassigned",
        rate_id: 7,
        gross_weight: 40000,
        tare_weight: 15000,
        net_weight: 25000,
        images: ["img1.jpg", "img2.jpg"],
        in_entry_id: 1,
        in_entry_created_at: "2026-08-31T08:00:00Z",
        out_entry_id: 2,
        out_entry_created_at: "2026-08-31T10:00:00Z",
        center_id: 1,
        center_name: "Center A",
        in_user_id: 2,
        in_user_name: "Operator 1",
        out_user_id: 4,
        out_user_name: "Operator 2",
        in_customer_id: 3,
        in_customer_name: "Customer 1",
        out_customer_id: 3,
        out_customer_name: "Customer 1",
        vehicle_number: "KA01AB1234",
        created_at: "2026-08-31T10:00:00Z",
        updated_at: "2026-08-31T10:00:00Z",
      });
    });
  });

  describe("deleteWeighments", () => {
    it("should soft delete weighments and cascade soft delete to linked entries", async () => {
      const weighmentsData = [
        {
          id: 10,
          in_entry_id: 1,
          out_entry_id: 2,
          in_entry: { factory_id: 1 },
        },
        {
          id: 20,
          in_entry_id: 3,
          out_entry_id: 4,
          in_entry: { factory_id: 1 },
        },
      ];

      const weighmentsUpdateMock = vi.fn(() => ({
        in: vi.fn(() => ({
          is: vi.fn().mockResolvedValue({ error: null }),
        })),
      }));

      const entriesUpdateMock = vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      }));

      mockClient.from.mockImplementation((table: string) => {
        if (table === "weighments") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                is: vi.fn().mockResolvedValue({ data: weighmentsData, error: null }),
              })),
            })),
            update: weighmentsUpdateMock,
          };
        }
        if (table === "entries") {
          return {
            update: entriesUpdateMock,
          };
        }
        return {};
      });

      const result = await deleteWeighments(mockClient, 1, [10, 20]);
      expect(result.deletedIds).toEqual([10, 20]);
      expect(result.cascadedEntryIds).toEqual([1, 2, 3, 4]);
      expect(weighmentsUpdateMock).toHaveBeenCalled();
      expect(entriesUpdateMock).toHaveBeenCalled();
    });

    it("should return empty deletedIds when no matching weighments exist for factory", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      });

      const result = await deleteWeighments(mockClient, 1, [999]);
      expect(result.deletedIds).toEqual([]);
      expect(result.cascadedEntryIds).toEqual([]);
    });

    it("should return empty arrays when weighmentIds is empty", async () => {
      const result = await deleteWeighments(mockClient, 1, []);
      expect(result.deletedIds).toEqual([]);
      expect(result.cascadedEntryIds).toEqual([]);
    });
  });
});
