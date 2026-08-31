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

type RawHandler = (
  request: NextRequest,
  user: { sub: string; username: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const sampleUser = { sub: "1", username: "admin", role: Role.ADMIN, factory_id: 1 };
const context = { params: Promise.resolve({}) };

describe("GET /api/commodities", () => {
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

  it("rejects when user lacks READ permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const req = new NextRequest("http://localhost/api/commodities");
    const response = await (GET as unknown as RawHandler)(req, sampleUser, {}, context);
    expect(response.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith(
      sampleUser,
      ProjectSlug.COMMODITIES,
      PermissionKey.READ,
    );
  });

  it("returns paginated results when permitted", async () => {
    const mockQuery: Record<string, unknown> = {};
    mockQuery.select = vi.fn(() => mockQuery);
    mockQuery.order = vi.fn(() => mockQuery);
    mockQuery.is = vi.fn(() => mockQuery);
    const mockDb = { from: vi.fn(() => mockQuery) };

    const req = new NextRequest("http://localhost/api/commodities");
    const response = await (GET as unknown as RawHandler)(req, sampleUser, mockDb, context);
    expect(response.status).toBe(200);
  });

  it("applies ilike search filter when search param is provided", async () => {
    const mockQuery: Record<string, unknown> = {};
    mockQuery.select = vi.fn(() => mockQuery);
    mockQuery.order = vi.fn(() => mockQuery);
    mockQuery.is = vi.fn(() => mockQuery);
    mockQuery.ilike = vi.fn(() => mockQuery);
    const mockDb = { from: vi.fn(() => mockQuery) };

    const req = new NextRequest("http://localhost/api/commodities?search=wheat");
    await (GET as unknown as RawHandler)(req, sampleUser, mockDb, context);
    expect(mockQuery.ilike).toHaveBeenCalledWith("name", "%wheat%");
  });
});
