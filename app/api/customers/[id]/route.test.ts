import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";

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

import { PATCH, DELETE } from "./route";

type RawHandler = (
  request: Request,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<{ id: string }> },
  scope: { entityId: number; factoryId: number },
) => Promise<Response>;

const sampleUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const context = { params: Promise.resolve({ id: "10" }) };
const scope = { entityId: 10, factoryId: 1 };
const request = new Request("http://localhost/api/customers/10");

describe("Customers [id] route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  describe("PATCH /api/customers/:id", () => {
    it("returns 404 when customer not found", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: null });
      const mockDb = { from: vi.fn(() => mockQuery) };

      const patchReq = new Request("http://localhost/api/customers/10", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        patchReq,
        sampleUser,
        mockDb,
        context,
        scope,
      );
      expect(response.status).toBe(404);
    });

    it("rejects when user is not owner and lacks WRITE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const existing = { id: 10, user_id: 99, name: "Other" };
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: existing });
      const mockDb = { from: vi.fn(() => mockQuery) };

      const patchReq = new Request("http://localhost/api/customers/10", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
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

    it("updates customer successfully via RPC", async () => {
      const existing = { id: 10, user_id: 1, name: "Existing" };
      const updated = { id: 10, name: "Renamed Customer", user_id: 1, factory_id: 1 };

      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: existing });

      const mockDb = {
        from: vi.fn(() => mockQuery),
        rpc: vi.fn().mockResolvedValue({ data: updated, error: null }),
      };

      const patchReq = new Request("http://localhost/api/customers/10", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed Customer" }),
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
      expect(json.data.name).toBe("Renamed Customer");
    });
  });

  describe("DELETE /api/customers/:id", () => {
    it("rejects when user lacks DELETE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const response = await (DELETE as unknown as RawHandler)(
        request,
        sampleUser,
        {},
        context,
        scope,
      );
      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.CUSTOMERS,
        PermissionKey.DELETE,
      );
    });

    it("rejects deletion when linked entries exist", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.limit = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 101 } });
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

    it("deletes customer successfully via RPC when no linked entries", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.limit = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: null });

      const mockDb = {
        from: vi.fn(() => mockQuery),
        rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
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
