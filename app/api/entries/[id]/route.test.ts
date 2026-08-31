import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntryStatus, PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

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

import { DELETE, PATCH } from "./route";

type RawHandler = (
  request: Request,
  user: {
    sub: string;
    username: string;
    role: Role;
    factory_id: number;
  },
  db: unknown,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

const sampleUser = {
  sub: "1",
  username: "operator",
  role: Role.OPERATOR,
  factory_id: 1,
};

const context = { params: Promise.resolve({ id: "10" }) };

describe("Entries [id] route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("rejects PATCH when entry status is REJECTED", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: EntryStatus.APPROVED }),
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 10,
                    status: EntryStatus.REJECTED,
                    vehicle_number: "MH12AB1234",
                    factory_id: 1,
                  },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.ENTRY_REJECTED_LOCKED);
  });

  it("allows updating vehicle_number on auto_approved entry when edited is false", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: "KA01AB9999" }),
    });

    const existingEntry = {
      id: 10,
      status: EntryStatus.APPROVED,
      auto_approved: true,
      edited: false,
      vehicle_number: "KA01AB1111",
      customer_id: null,
      center_id: 1,
      factory_id: 1,
      created_at: "2026-08-31T00:00:00Z",
    };

    let fetchCount = 0;
    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "entries") {
          const query: Record<string, unknown> = {};
          query.select = vi.fn(() => query);
          query.eq = vi.fn(() => query);
          query.neq = vi.fn(() => query);
          query.lt = vi.fn(() => query);
          query.is = vi.fn(() => query);
          query.or = vi.fn(() => query);
          query.order = vi.fn(() => query);
          query.limit = vi.fn(() => query);
          query.maybeSingle = vi.fn().mockImplementation(async () => {
            fetchCount++;
            if (fetchCount === 1) return { data: existingEntry, error: null };
            return { data: null, error: null };
          });
          query.single = vi.fn().mockResolvedValue({
            data: {
              ...existingEntry,
              vehicle_number: "KA01AB9999",
              edited: true,
            },
            error: null,
          });
          query.update = vi.fn(() => query);
          return query;
        }
        const wQuery: Record<string, unknown> = {};
        wQuery.select = vi.fn(() => wQuery);
        wQuery.or = vi.fn(() => wQuery);
        wQuery.is = vi.fn(() => wQuery);
        wQuery.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        return wQuery;
      }),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.vehicle_number).toBe("KA01AB9999");
    expect(json.data.edited).toBe(true);
  });

  it("rejects updating vehicle_number on auto_approved entry when edited is already true", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: "KA01AB8888" }),
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 10,
                    status: EntryStatus.APPROVED,
                    auto_approved: true,
                    edited: true,
                    vehicle_number: "KA01AB9999",
                    customer_id: null,
                    factory_id: 1,
                  },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.VEHICLE_ALREADY_EDITED_LOCKED);
  });

  it("rejects updating vehicle_number on manually approved entry", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: "KA01AB8888" }),
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 10,
                    status: EntryStatus.APPROVED,
                    auto_approved: false,
                    edited: false,
                    vehicle_number: "KA01AB1111",
                    customer_id: null,
                    factory_id: 1,
                  },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.CANNOT_MODIFY_MANUALLY_APPROVED_VEHICLE);
  });

  it("rejects PATCH when entry is fully locked (approved with customer and edited/manual)", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: "KA01AB8888" }),
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 10,
                    status: EntryStatus.APPROVED,
                    auto_approved: false,
                    edited: false,
                    vehicle_number: "KA01AB1111",
                    customer_id: 5,
                    factory_id: 1,
                  },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.ENTRY_FULLY_LOCKED);
  });

  it("blocks DELETE when entry is linked to an active weighment", async () => {
    mockHasPermission.mockReturnValue(true);
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            is: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 50 },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.CANNOT_DELETE_ENTRY(10));
  });

  it("allows DELETE when entry is not linked to any active weighment", async () => {
    mockHasPermission.mockReturnValue(true);
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "weighments") {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                is: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [{ id: 10 }] }),
                })),
              })),
            })),
          })),
        };
      }),
    };

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true, id: 10 });
  });

  it("rejects DELETE when user lacks DELETE permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, {}, context);

    expect(response.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith(
      sampleUser,
      ProjectSlug.ENTRIES,
      PermissionKey.DELETE,
    );
  });
});
