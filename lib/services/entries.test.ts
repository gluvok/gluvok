/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEntry,
  validateCenterBelongsToFactory,
  validateCustomerBelongsToFactory,
} from "./entries";
import { EntryStatus, EntryType } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

const { mockUploadImages, mockValidateSeq, mockTryMerge } = vi.hoisted(() => ({
  mockUploadImages: vi.fn(),
  mockValidateSeq: vi.fn(),
  mockTryMerge: vi.fn(),
}));

vi.mock("./storage", () => ({
  uploadBase64ImagesToStorage: mockUploadImages,
}));

vi.mock("./weighments", () => ({
  validateSequentialApproval: mockValidateSeq,
  tryMergeEntries: mockTryMerge,
}));

describe("Entries Service", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadImages.mockResolvedValue(["http://img1.jpg"]);
    mockValidateSeq.mockResolvedValue(undefined);
    mockTryMerge.mockResolvedValue(null);

    mockClient = {
      from: vi.fn(),
    };
  });

  describe("validateCenterBelongsToFactory", () => {
    it("passes when center exists in factory", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: 1, auto_approve: false }, error: null }),
      });

      const res = await validateCenterBelongsToFactory(mockClient, 1, 10);
      expect(res).toEqual({ id: 1, auto_approve: false });
    });

    it("throws SELECTED_CENTER_NOT_FOUND when center is missing", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(validateCenterBelongsToFactory(mockClient, 1, 10)).rejects.toThrow(
        ApiErrorMessage.SELECTED_CENTER_NOT_FOUND,
      );
    });
  });

  describe("validateCustomerBelongsToFactory", () => {
    it("passes when customer exists in factory", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 2 }, error: null }),
      });

      await expect(validateCustomerBelongsToFactory(mockClient, 2, 10)).resolves.toBeUndefined();
    });

    it("throws CUSTOMER_NOT_FOUND when customer is missing", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(validateCustomerBelongsToFactory(mockClient, 2, 10)).rejects.toThrow(
        ApiErrorMessage.CUSTOMER_NOT_FOUND,
      );
    });
  });

  describe("createEntry", () => {
    it("creates a manual entry with default pending status and customer", async () => {
      const insertedEntry = {
        id: 100,
        vehicle_number: "MH12AB1234",
        weight: 12000,
        type: EntryType.MANUAL,
        center_id: 1,
        user_id: 5,
        customer_id: 2,
        factory_id: 10,
        status: EntryStatus.PENDING,
        auto_approved: false,
        images: ["http://img1.jpg"],
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === "centers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: 1, auto_approve: false }, error: null }),
          };
        }
        if (table === "customers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 2 }, error: null }),
          };
        }
        if (table === "entries") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedEntry, error: null }),
              }),
            }),
          };
        }
      });

      const res = await createEntry(mockClient, {
        factoryId: 10,
        userId: 5,
        vehicleNumber: "MH12AB1234",
        weight: 12000,
        centerId: 1,
        customerId: 2,
        images: ["data:image/jpeg;base64,..."],
      });

      expect(res).toEqual(insertedEntry);
      expect(mockUploadImages).toHaveBeenCalledWith(["data:image/jpeg;base64,..."], 10);
      expect(mockValidateSeq).not.toHaveBeenCalled();
      expect(mockTryMerge).not.toHaveBeenCalled();
    });

    it("creates an automatic entry with approved status and runs sequential approval and merge", async () => {
      const insertedEntry = {
        id: 101,
        detected_vehicle_number: "MH12AB1234",
        vehicle_number: "MH12AB1234",
        weight: 15000,
        type: EntryType.AUTOMATIC,
        center_id: 1,
        user_id: 5,
        customer_id: null,
        factory_id: 10,
        status: EntryStatus.APPROVED,
        auto_approved: true,
        images: ["http://img1.jpg"],
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === "centers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: 1, auto_approve: true }, error: null }),
          };
        }
        if (table === "entries") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedEntry, error: null }),
              }),
            }),
          };
        }
      });

      const res = await createEntry(mockClient, {
        factoryId: 10,
        userId: 5,
        vehicleNumber: "MH12AB1234",
        detectedVehicleNumber: "MH12AB1234",
        weight: 15000,
        centerId: 1,
        type: EntryType.AUTOMATIC,
        status: EntryStatus.APPROVED,
      });

      expect(res).toEqual(insertedEntry);
      expect(mockValidateSeq).toHaveBeenCalledWith(
        mockClient,
        1,
        "MH12AB1234",
        expect.any(String),
        0,
        EntryType.AUTOMATIC,
      );
      expect(mockTryMerge).toHaveBeenCalledWith(mockClient, 10, 101);
    });

    it("throws error when db insert fails", async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === "centers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: 1, auto_approve: false }, error: null }),
          };
        }
        if (table === "entries") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "DB failure" } }),
              }),
            }),
          };
        }
      });

      await expect(
        createEntry(mockClient, {
          factoryId: 10,
          userId: 5,
          vehicleNumber: "MH12AB1234",
          weight: 12000,
          centerId: 1,
        }),
      ).rejects.toThrow(ApiErrorMessage.CREATE_ENTRY_FAILED);
    });
  });
});
