import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role, Unit, WeighmentType } from "@/lib/constants/enums";
import { NextRequest } from "next/server";

const { mockHasPermission } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
}));

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
    hasPermission: mockHasPermission,
  };
});

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
  context?: unknown,
) => Promise<Response>;

const sampleUser = {
  sub: "1",
  username: "operator",
  role: Role.OPERATOR,
  factory_id: 1,
};

describe("GET /api/weighments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("rejects when user lacks READ permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const req = new NextRequest("http://localhost/api/weighments");
    const handler = GET as unknown as RawHandler;
    const response = await handler(req, sampleUser, {});

    expect(response.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith(
      sampleUser,
      ProjectSlug.WEIGHMENTS,
      PermissionKey.READ,
    );
  });

  it("returns formatted list of weighments", async () => {
    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 10,
                      unit: Unit.KG,
                      type: WeighmentType.UNASSIGNED,
                      in_entry_id: 1,
                      out_entry_id: 2,
                      created_at: "2026-08-31T10:00:00Z",
                      updated_at: "2026-08-31T10:00:00Z",
                      in_entry: {
                        center_id: 1,
                        weight: 15000,
                        vehicle_number: "KA01AB1234",
                        centers: { name: "Center A" },
                        users: { name: "Operator 1" },
                        customers: { name: "Farmer 1" },
                      },
                      out_entry: {
                        center_id: 1,
                        weight: 5000,
                        vehicle_number: "KA01AB1234",
                        centers: { name: "Center A" },
                        users: { name: "Operator 2" },
                        customers: { name: "Farmer 1" },
                      },
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

    const req = new NextRequest("http://localhost/api/weighments?page=1&limit=10");
    const handler = GET as unknown as RawHandler;
    const response = await handler(req, sampleUser, mockDb);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].gross_weight).toBe(15000);
    expect(json.data[0].tare_weight).toBe(5000);
    expect(json.data[0].net_weight).toBe(10000);
    expect(json.data[0].center_name).toBe("Center A");
    expect(json.data[0].center_id).toBe(1);
  });

  it("filters by user_id using entry ID pre-resolution without PostgREST syntax error", async () => {
    const orMock = vi.fn();
    const mockQuery: Record<string, unknown> = {};
    mockQuery.select = vi.fn(() => mockQuery);
    mockQuery.eq = vi.fn(() => mockQuery);
    mockQuery.is = vi.fn(() => mockQuery);
    mockQuery.order = vi.fn(() => mockQuery);
    mockQuery.or = orMock.mockImplementation(() => mockQuery);
    mockQuery.range = vi.fn().mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "entries") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn().mockResolvedValue({ data: [{ id: 101 }, { id: 102 }] }),
                })),
              })),
            })),
          };
        }
        return mockQuery;
      }),
    };

    const req = new NextRequest("http://localhost/api/weighments?user_id=5&page=1&limit=10");
    const handler = GET as unknown as RawHandler;
    const response = await handler(req, sampleUser, mockDb);

    expect(response.status).toBe(200);
    expect(orMock).toHaveBeenCalledWith("in_entry_id.in.(101,102),out_entry_id.in.(101,102)");
  });
});
