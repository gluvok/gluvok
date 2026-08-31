import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role, Unit } from "@/lib/constants/enums";
import { NextRequest } from "next/server";

const { mockHasPermission } = vi.hoisted(() => ({ mockHasPermission: vi.fn() }));

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
    hasPermission: mockHasPermission,
  };
});

import { GET, POST, DELETE } from "./route";

type RawHandler = (
  request: Request,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const sampleUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const context = { params: Promise.resolve({}) };

describe("Rates collection route handlers (/api/rates)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  describe("GET /api/rates", () => {
    it("rejects when user lacks READ permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/rates");
      const response = await (GET as unknown as RawHandler)(req, sampleUser, {}, context);
      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.RATES,
        PermissionKey.READ,
      );
    });

    it("fetches rates and formats commodity_name", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.range = vi.fn().mockResolvedValue({
        data: [{ id: 1, commodity_id: 2, unit_price: "50", commodities: { name: "Wheat" } }],
        count: 1,
        error: null,
      });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const req = new NextRequest("http://localhost/api/rates");
      const response = await (GET as unknown as RawHandler)(req, sampleUser, mockDb, context);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data[0].commodity_name).toBe("Wheat");
    });
  });

  describe("POST /api/rates", () => {
    it("rejects when user lacks CREATE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new Request("http://localhost/api/rates", {
        method: "POST",
        body: JSON.stringify({ commodity_id: 1, unit_price: "25", unit: Unit.KG }),
      });
      const response = await (POST as unknown as RawHandler)(req, sampleUser, {}, context);
      expect(response.status).toBe(403);
    });

    it("creates rate successfully", async () => {
      const created = { id: 1, commodity_id: 1, unit_price: "25", unit: Unit.KG, factory_id: 1 };
      const mockQuery: Record<string, unknown> = {};
      mockQuery.insert = vi.fn(() => mockQuery);
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.single = vi.fn().mockResolvedValue({ data: created, error: null });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const req = new Request("http://localhost/api/rates", {
        method: "POST",
        body: JSON.stringify({ commodity_id: 1, unit_price: "25", unit: Unit.KG }),
      });
      const response = await (POST as unknown as RawHandler)(req, sampleUser, mockDb, context);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.unit_price).toBe("25");
    });
  });

  describe("DELETE /api/rates (bulk)", () => {
    it("rejects when user lacks DELETE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new Request("http://localhost/api/rates", {
        method: "DELETE",
        body: JSON.stringify({ ids: [1, 2] }),
      });
      const response = await (DELETE as unknown as RawHandler)(req, sampleUser, {}, context);
      expect(response.status).toBe(403);
    });

    it("rejects deletion when linked weighments exist", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.in = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.limit = vi.fn().mockResolvedValue({ data: [{ id: 99 }], error: null });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const req = new Request("http://localhost/api/rates", {
        method: "DELETE",
        body: JSON.stringify({ ids: [1] }),
      });
      const response = await (DELETE as unknown as RawHandler)(req, sampleUser, mockDb, context);
      expect(response.status).toBe(400);
    });
  });
});
