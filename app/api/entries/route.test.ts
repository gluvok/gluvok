import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role, EntryStatus, EntryType } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

const { mockHasPermission, mockCreateEntry } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
  mockCreateEntry: vi.fn(),
}));

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
    hasPermission: mockHasPermission,
  };
});

vi.mock("@/lib/services/entries", () => ({
  createEntry: mockCreateEntry,
}));

import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

type RawHandler = (
  request: NextRequest,
  user: {
    sub: string;
    username: string;
    role: Role;
    factory_id: number;
  },
  db: unknown,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const sampleUser = {
  sub: "1",
  username: "operator",
  role: Role.OPERATOR,
  factory_id: 1,
};

const context = { params: Promise.resolve({}) };

describe("Entries route handlers (/api/entries)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  describe("GET /api/entries", () => {
    it("rejects when user lacks READ permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/entries");
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.ENTRIES,
        PermissionKey.READ,
      );
    });

    it("returns formatted list of entries", async () => {
      const mockDb = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 1,
                        vehicle_number: "MH12AB1234",
                        centers: { name: "Main Center" },
                        users: { name: "Operator 1" },
                        customers: { name: "Customer A" },
                      },
                    ],
                    count: 1,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      const req = new NextRequest("http://localhost/api/entries?page=1&limit=10");
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, sampleUser, mockDb, context);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data[0].center_name).toBe("Main Center");
      expect(json.data[0].user_name).toBe("Operator 1");
      expect(json.data[0].customer_name).toBe("Customer A");
      expect(json.pagination.total).toBe(1);
    });

    it("filters entries by auto_approved and edited boolean flags", async () => {
      const eqMock = vi.fn();
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = eqMock.mockImplementation(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.range = vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      const mockDb = {
        from: vi.fn(() => mockQuery),
      };

      const req = new NextRequest(
        "http://localhost/api/entries?auto_approved=true&edited=false&page=1&limit=10",
      );
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, sampleUser, mockDb, context);

      expect(response.status).toBe(200);
      expect(eqMock).toHaveBeenCalledWith("auto_approved", true);
      expect(eqMock).toHaveBeenCalledWith("edited", false);
    });

    it("scopes entries query by customer_id and user_id for Role.BASE users", async () => {
      const orMock = vi.fn();
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.or = orMock.mockImplementation(() => mockQuery);
      mockQuery.range = vi.fn().mockResolvedValue({
        data: [{ id: 5, vehicle_number: "BASE123" }],
        count: 1,
        error: null,
      });

      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "customers") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn().mockResolvedValue({ data: [{ id: 42 }] }),
                })),
              })),
            };
          }
          return mockQuery;
        }),
      };

      const baseUser = {
        sub: "10",
        username: "cust_priya",
        role: Role.BASE,
        factory_id: 1,
      };

      const req = new NextRequest("http://localhost/api/entries?page=1&limit=10");
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, baseUser, mockDb, context);

      expect(response.status).toBe(200);
      expect(orMock).toHaveBeenCalledWith("customer_id.in.(42),user_id.eq.10");
    });
  });

  describe("POST /api/entries", () => {
    it("rejects when user lacks CREATE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_number: "MH12AB1234",
          weight: 10000,
          center_id: 1,
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.ENTRIES,
        PermissionKey.CREATE,
      );
    });

    it("returns 400 for invalid body schema", async () => {
      const req = new NextRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_number: "INVALID-PLATE",
          weight: -50,
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(400);
    });

    it("successfully creates entry via createEntry service", async () => {
      const createdEntry = {
        id: 10,
        vehicle_number: "MH12AB1234",
        weight: 12000,
        center_id: 1,
        user_id: 1,
        factory_id: 1,
        type: EntryType.MANUAL,
        status: EntryStatus.PENDING,
      };
      mockCreateEntry.mockResolvedValue(createdEntry);

      const req = new NextRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_number: "MH12AB1234",
          weight: 12000,
          center_id: 1,
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data).toEqual(createdEntry);
      expect(mockCreateEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          factoryId: 1,
          userId: 1,
          type: EntryType.MANUAL,
          vehicleNumber: "MH12AB1234",
          weight: 12000,
          centerId: 1,
          status: EntryStatus.PENDING,
        }),
      );
    });

    it("creates AUTOMATIC entry when caller has Role.HARDWARE", async () => {
      const hardwareUser = {
        sub: "5",
        username: "hardware_scale_1",
        role: Role.HARDWARE,
        factory_id: 1,
      };

      const createdEntry = {
        id: 20,
        detected_vehicle_number: "KA01AB1234",
        vehicle_number: "KA01AB1234",
        weight: 15000,
        center_id: 1,
        user_id: 5,
        factory_id: 1,
        type: EntryType.AUTOMATIC,
        status: EntryStatus.PENDING,
      };
      mockCreateEntry.mockResolvedValue(createdEntry);

      const req = new NextRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detected_vehicle_number: "KA01AB1234",
          vehicle_number: "KA01AB1234",
          weight: 15000,
          center_id: 1,
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, hardwareUser, {}, context);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.type).toBe(EntryType.AUTOMATIC);
      expect(mockCreateEntry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          factoryId: 1,
          userId: 5,
          type: EntryType.AUTOMATIC,
          detectedVehicleNumber: "KA01AB1234",
          vehicleNumber: "KA01AB1234",
          weight: 15000,
          centerId: 1,
        }),
      );
    });

    it("handles createEntry service error", async () => {
      mockCreateEntry.mockRejectedValue(new Error(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND));

      const req = new NextRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_number: "MH12AB1234",
          weight: 12000,
          center_id: 999,
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND);
    });
  });

  describe("DELETE /api/entries", () => {
    it("rejects when user lacks DELETE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [1, 2] }),
      });

      const handler = DELETE as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.ENTRIES,
        PermissionKey.DELETE,
      );
    });

    it("rejects invalid ids payload", async () => {
      const req = new NextRequest("http://localhost/api/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      });

      const handler = DELETE as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe(ApiErrorMessage.PROVIDE_VALID_IDS);
    });
  });
});
