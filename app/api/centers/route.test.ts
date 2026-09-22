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

import * as routeHandlers from "./route";
import { GET } from "./route";

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
  username: "admin",
  role: Role.ADMIN,
  factory_id: 1,
};

const context = { params: Promise.resolve({}) };

describe("Centers route handlers (/api/centers)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockFetchPaginatedResult.mockImplementation(async () => {
      return new Response(JSON.stringify({ data: [], pagination: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  describe("GET /api/centers", () => {
    it("rejects when user lacks READ permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/centers");
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.CENTERS,
        PermissionKey.READ,
      );
    });

    it("filters query by auto_approve=true when provided", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);

      const mockDb = {
        from: vi.fn(() => mockQuery),
      };

      const req = new NextRequest("http://localhost/api/centers?auto_approve=true");
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, sampleUser, mockDb, context);

      expect(response.status).toBe(200);
      expect(mockQuery.eq).toHaveBeenCalledWith("auto_approve", true);
    });

    it("filters query by auto_approve=false when provided", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);

      const mockDb = {
        from: vi.fn(() => mockQuery),
      };

      const req = new NextRequest("http://localhost/api/centers?auto_approve=false");
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, sampleUser, mockDb, context);

      expect(response.status).toBe(200);
      expect(mockQuery.eq).toHaveBeenCalledWith("auto_approve", false);
    });
  });

  describe("POST /api/centers", () => {
    it("does not export a POST handler (center creation is disallowed)", () => {
      expect((routeHandlers as Record<string, unknown>).POST).toBeUndefined();
    });
  });

  describe("DELETE /api/centers", () => {
    it("does not export a DELETE handler (center deletion is disallowed)", () => {
      expect((routeHandlers as Record<string, unknown>).DELETE).toBeUndefined();
    });
  });
});
