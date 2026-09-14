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
const context = { params: Promise.resolve({ id: "5" }) };
const scope = { entityId: 5, factoryId: 1 };
const request = new Request("http://localhost/api/centers/5");

describe("Centers [id] route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  describe("PATCH /api/centers/:id", () => {
    it("rejects when user lacks WRITE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const patchReq = new Request("http://localhost/api/centers/5", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        patchReq,
        sampleUser,
        {},
        context,
        scope,
      );
      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.CENTERS,
        PermissionKey.WRITE,
      );
    });

    it("returns 400 when validation fails", async () => {
      const patchReq = new Request("http://localhost/api/centers/5", {
        method: "PATCH",
        body: JSON.stringify({ name: 123 }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        patchReq,
        sampleUser,
        {},
        context,
        scope,
      );
      expect(response.status).toBe(400);
    });

    it("updates center successfully", async () => {
      const updated = { id: 5, name: "Renamed Center", auto_approve: false, factory_id: 1 };
      const mockQuery: Record<string, unknown> = {};
      mockQuery.update = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
      const mockDb = { from: vi.fn(() => mockQuery) };

      const patchReq = new Request("http://localhost/api/centers/5", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed Center" }),
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
      expect(json.data.name).toBe("Renamed Center");
    });

    it("returns 409 Conflict when new name violates unique constraint", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.update = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      });
      const mockDb = { from: vi.fn(() => mockQuery) };

      const patchReq = new Request("http://localhost/api/centers/5", {
        method: "PATCH",
        body: JSON.stringify({ name: "Existing Center" }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        patchReq,
        sampleUser,
        mockDb,
        context,
        scope,
      );
      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error).toContain("already exists in this factory");
    });
  });

  describe("DELETE /api/centers/:id", () => {
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
        ProjectSlug.CENTERS,
        PermissionKey.DELETE,
      );
    });

    it("rejects deletion when linked entries exist", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.limit = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 99 } });
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

    it("soft-deletes center when no linked entries", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.update = vi.fn(() => mockQuery);
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
          updateChain.select = vi.fn().mockResolvedValue({ data: [{ id: 5 }], error: null });
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
