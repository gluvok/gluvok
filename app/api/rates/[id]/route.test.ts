import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role, Unit } from "@/lib/constants/enums";

const { mockHasPermission } = vi.hoisted(() => ({ mockHasPermission: vi.fn() }));

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
    withEntityScope: <T>(handler: T) => handler,
    hasPermission: mockHasPermission,
  };
});

import { GET, PATCH, DELETE } from "./route";

type RawHandler = (
  request: Request,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<{ id: string }> },
  scope: { entityId: number; factoryId: number },
) => Promise<Response>;

const sampleUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const context = { params: Promise.resolve({ id: "3" }) };
const scope = { entityId: 3, factoryId: 1 };
const request = new Request("http://localhost/api/rates/3");

describe("Rates [id] route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  describe("GET /api/rates/:id", () => {
    it("rejects when user lacks READ permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const response = await (GET as unknown as RawHandler)(
        request,
        sampleUser,
        {},
        context,
        scope,
      );
      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.RATES,
        PermissionKey.READ,
      );
    });

    it("returns rate with formatted commodity_name", async () => {
      const rate = { id: 3, commodity_id: 1, unit_price: "40", commodities: { name: "Corn" } };
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: rate, error: null });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const response = await (GET as unknown as RawHandler)(
        request,
        sampleUser,
        mockDb,
        context,
        scope,
      );
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.commodity_name).toBe("Corn");
    });
  });

  describe("PATCH /api/rates/:id", () => {
    it("rejects when rate is linked to weighments", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.limit = vi.fn().mockResolvedValue({ data: [{ id: 50 }], error: null });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const patchReq = new Request("http://localhost/api/rates/3", {
        method: "PATCH",
        body: JSON.stringify({ commodity_id: 1, unit_price: "45", unit: Unit.KG }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        patchReq,
        sampleUser,
        mockDb,
        context,
        scope,
      );
      expect(response.status).toBe(403);
    });

    it("updates rate successfully when no weighments linked", async () => {
      const updated = { id: 3, commodity_id: 1, unit_price: "45", unit: Unit.KG, factory_id: 1 };
      let callCount = 0;
      const mockDb = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            const checkChain: Record<string, unknown> = {};
            checkChain.select = vi.fn(() => checkChain);
            checkChain.eq = vi.fn(() => checkChain);
            checkChain.is = vi.fn(() => checkChain);
            checkChain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
            return checkChain;
          }
          const updateChain: Record<string, unknown> = {};
          updateChain.update = vi.fn(() => updateChain);
          updateChain.eq = vi.fn(() => updateChain);
          updateChain.is = vi.fn(() => updateChain);
          updateChain.select = vi.fn(() => updateChain);
          updateChain.maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
          return updateChain;
        }),
      };

      const patchReq = new Request("http://localhost/api/rates/3", {
        method: "PATCH",
        body: JSON.stringify({ commodity_id: 1, unit_price: "45", unit: Unit.KG }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        patchReq,
        sampleUser,
        mockDb,
        context,
        scope,
      );
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.unit_price).toBe("45");
    });
  });

  describe("DELETE /api/rates/:id", () => {
    it("rejects when weighment is linked", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.limit = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 10 } });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const response = await (DELETE as unknown as RawHandler)(
        request,
        sampleUser,
        mockDb,
        context,
        scope,
      );
      expect(response.status).toBe(400);
    });

    it("deletes rate successfully when no weighments linked", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.limit = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: null });

      let callCount = 0;
      const mockDb = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) return mockQuery;
          const updateChain: Record<string, unknown> = {};
          updateChain.update = vi.fn(() => updateChain);
          updateChain.eq = vi.fn(() => updateChain);
          updateChain.is = vi.fn(() => updateChain);
          updateChain.select = vi.fn().mockResolvedValue({ data: [{ id: 3 }], error: null });
          return updateChain;
        }),
      };

      const response = await (DELETE as unknown as RawHandler)(
        request,
        sampleUser,
        mockDb,
        context,
        scope,
      );
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });
});
