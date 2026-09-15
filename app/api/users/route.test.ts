import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
import { NextRequest } from "next/server";

const { mockHasPermission, mockFetchPaginatedResult } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
  mockFetchPaginatedResult: vi.fn(),
}));

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
    hasPermission: mockHasPermission,
    fetchPaginatedResult: mockFetchPaginatedResult,
  };
});

import { GET, POST, DELETE } from "./route";

type RawHandler = (
  request: Request,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const adminUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const managerUser = { sub: "2", role: Role.MANAGER, factory_id: 1 };
const context = { params: Promise.resolve({}) };

describe("Users collection route handlers (/api/users)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockFetchPaginatedResult.mockResolvedValue(
      new Response(JSON.stringify({ data: [], pagination: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  describe("GET /api/users", () => {
    it("rejects when user lacks READ permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/users");
      const response = await (GET as unknown as RawHandler)(req, adminUser, {}, context);
      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        adminUser,
        ProjectSlug.USERS,
        PermissionKey.READ,
      );
    });

    it("returns paginated users when permitted", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.neq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);

      const mockDb = { from: vi.fn(() => mockQuery) };
      const req = new NextRequest("http://localhost/api/users");
      const response = await (GET as unknown as RawHandler)(req, adminUser, mockDb, context);
      expect(response.status).toBe(200);
      expect(mockQuery.select).toHaveBeenCalledWith(
        "id, username, name, role, factory_id, created_at, updated_at",
        { count: "exact" },
      );
    });
  });

  describe("POST /api/users", () => {
    it("rejects when user lacks CREATE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Op",
          username: "op1",
          password: "Password123!",
          confirmPassword: "Password123!",
          role: Role.OPERATOR,
        }),
      });
      const response = await (POST as unknown as RawHandler)(req, adminUser, {}, context);
      expect(response.status).toBe(403);
    });

    it("prevents Manager from creating Admin users", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: null });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const req = new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Admin",
          username: "admin2",
          password: "Password123!",
          confirmPassword: "Password123!",
          role: Role.ADMIN,
        }),
      });
      const response = await (POST as unknown as RawHandler)(req, managerUser, mockDb, context);
      expect(response.status).toBe(403);
    });

    it("creates user successfully", async () => {
      const created = {
        id: 3,
        name: "Operator One",
        username: "op1",
        role: Role.OPERATOR,
        factory_id: 1,
      };
      let callCount = 0;
      const mockDb = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            const checkChain: Record<string, unknown> = {};
            checkChain.select = vi.fn(() => checkChain);
            checkChain.eq = vi.fn(() => checkChain);
            checkChain.is = vi.fn(() => checkChain);
            checkChain.maybeSingle = vi.fn().mockResolvedValue({ data: null });
            return checkChain;
          }
          const insertChain: Record<string, unknown> = {};
          insertChain.insert = vi.fn(() => insertChain);
          insertChain.select = vi.fn(() => insertChain);
          insertChain.single = vi.fn().mockResolvedValue({ data: created, error: null });
          return insertChain;
        }),
      };

      const req = new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Operator One",
          username: "op1",
          password: "Password123!",
          confirmPassword: "Password123!",
          role: Role.OPERATOR,
        }),
      });
      const response = await (POST as unknown as RawHandler)(req, adminUser, mockDb, context);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.name).toBe("Operator One");
    });
  });

  describe("DELETE /api/users (bulk)", () => {
    it("rejects when user lacks DELETE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ ids: [3] }),
      });
      const response = await (DELETE as unknown as RawHandler)(req, adminUser, {}, context);
      expect(response.status).toBe(403);
    });

    it("rejects self-deletion in bulk delete with 403", async () => {
      mockHasPermission.mockReturnValue(true);
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ ids: [1] }), // adminUser.sub = "1"
      });
      // role-lookup query returns a Base user, but actor is also id 1
      const mockDb = {
        from: vi.fn(() => {
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn(() => chain);
          chain.in = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.is = vi.fn(() => chain);
          chain.limit = vi
            .fn()
            .mockResolvedValue({ data: [{ id: 1, role: Role.BASE }], error: null });
          return chain;
        }),
      };
      const response = await (DELETE as unknown as RawHandler)(req, adminUser, mockDb, context);
      expect(response.status).toBe(403);
    });

    it("rejects deletion when target role is outside hierarchy with 403", async () => {
      mockHasPermission.mockReturnValue(true);
      const mockDb = {
        from: vi.fn(() => {
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn(() => chain);
          chain.in = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          // Manager trying to delete another Manager — .is() is the terminal
          chain.is = vi
            .fn()
            .mockResolvedValue({ data: [{ id: 3, role: Role.MANAGER }], error: null });
          return chain;
        }),
      };
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ ids: [3] }),
      });
      const response = await (DELETE as unknown as RawHandler)(req, managerUser, mockDb, context);
      expect(response.status).toBe(403);
    });

    it("rejects deletion when customer is linked to user", async () => {
      mockHasPermission.mockReturnValue(true);
      let callCount = 0;
      const mockDb = {
        from: vi.fn(() => {
          callCount++;
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn(() => chain);
          chain.in = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.is = vi.fn(() => chain);
          if (callCount === 1) {
            // role-lookup: target is Base, actor is Admin (sub: "1"), target id: 3 ≠ sub
            chain.limit = vi
              .fn()
              .mockResolvedValue({ data: [{ id: 3, role: Role.BASE }], error: null });
          } else {
            // customer-link check
            chain.limit = vi.fn().mockResolvedValue({ data: [{ id: 10 }], error: null });
          }
          return chain;
        }),
      };
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ ids: [3] }),
      });
      const response = await (DELETE as unknown as RawHandler)(req, adminUser, mockDb, context);
      expect(response.status).toBe(400);
    });

    it("successfully bulk-deletes a permitted user", async () => {
      mockHasPermission.mockReturnValue(true);
      let callCount = 0;
      const mockDb = {
        from: vi.fn(() => {
          callCount++;
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn(() => chain);
          chain.in = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.is = vi.fn(() => chain);
          if (callCount === 1) {
            // role-lookup: target is Base
            chain.limit = vi
              .fn()
              .mockResolvedValue({ data: [{ id: 3, role: Role.BASE }], error: null });
          } else if (callCount === 2) {
            // customer-link check: none
            chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
          } else {
            // actual update
            chain.update = vi.fn(() => chain);
            chain.select = vi.fn().mockResolvedValue({ data: [{ id: 3 }], error: null });
          }
          return chain;
        }),
      };

      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ ids: [3] }),
      });
      const response = await (DELETE as unknown as RawHandler)(req, adminUser, mockDb, context);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.deleted_count).toBe(1);
    });
  });
});
