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

import { GET } from "./route";

type RawGetHandler = (
  request: NextRequest,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
) => Promise<Response>;

const adminUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const managerUser = { sub: "2", role: Role.MANAGER, factory_id: 1 };
const baseUser = { sub: "3", role: Role.BASE, factory_id: 1 };
const request = new NextRequest("http://localhost/api/settings");

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockFetchPaginatedResult.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: 1, name: "Test Factory", check_center_on_merge: false }],
          pagination: { page: 1, limit: 10, total: 1 },
        }),
        { status: 200 },
      ),
    );
  });

  it("rejects when user lacks READ permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const response = await (GET as unknown as RawGetHandler)(request, baseUser, {});
    expect(response.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith(baseUser, ProjectSlug.SETTINGS, PermissionKey.READ);
  });

  it("allows Admin and returns factory settings", async () => {
    const mockQuery: Record<string, unknown> = {};
    mockQuery.select = vi.fn(() => mockQuery);
    mockQuery.order = vi.fn(() => mockQuery);
    mockQuery.eq = vi.fn(() => mockQuery);
    mockQuery.is = vi.fn(() => mockQuery);

    const mockDb = { from: vi.fn(() => mockQuery) };

    const response = await (GET as unknown as RawGetHandler)(request, adminUser, mockDb);
    expect(response.status).toBe(200);
    expect(mockDb.from).toHaveBeenCalledWith("factories");
    expect(mockQuery.eq).toHaveBeenCalledWith("id", 1);
  });

  it("allows Manager to read factory settings", async () => {
    const mockQuery: Record<string, unknown> = {};
    mockQuery.select = vi.fn(() => mockQuery);
    mockQuery.order = vi.fn(() => mockQuery);
    mockQuery.eq = vi.fn(() => mockQuery);
    mockQuery.is = vi.fn(() => mockQuery);

    const mockDb = { from: vi.fn(() => mockQuery) };

    const response = await (GET as unknown as RawGetHandler)(request, managerUser, mockDb);
    expect(response.status).toBe(200);
    expect(mockDb.from).toHaveBeenCalledWith("factories");
  });
});
