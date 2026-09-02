import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntryStatus, EntrySource, PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
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

  it("allows updating vehicle_number on auto_approved entry when unedited", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: "KA01AB9999" }),
    });

    const existingEntry = {
      id: 10,
      status: EntryStatus.APPROVED,
      auto_approved: true,
      detected_vehicle_number: "KA01AB1111",
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

  it("rejects updating vehicle_number on auto_approved entry when vehicle is already edited", async () => {
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
                    detected_vehicle_number: "KA01AB1111",
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
                    detected_vehicle_number: null,
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
                    detected_vehicle_number: null,
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
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 50 }],
                error: null,
              }),
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
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          };
        }
        return {
          update: vi.fn(() => ({
            in: vi.fn(() => ({
              is: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [{ id: 10 }], error: null }),
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

  it("allows updating vehicle_number on automatic pending entry without setting edited to true", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: "KA01AB7777" }),
    });

    const existingEntry = {
      id: 10,
      status: EntryStatus.PENDING,
      source: EntrySource.DEVICE,
      auto_approved: false,
      detected_vehicle_number: "KA01AB1111",
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
          query.is = vi.fn(() => query);
          query.maybeSingle = vi.fn().mockImplementation(async () => {
            fetchCount++;
            if (fetchCount === 1) return { data: existingEntry, error: null };
            return { data: null, error: null };
          });
          query.single = vi.fn().mockResolvedValue({
            data: {
              ...existingEntry,
              vehicle_number: "KA01AB7777",
            },
            error: null,
          });
          query.update = vi.fn(() => query);
          return query;
        }
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.vehicle_number).toBe("KA01AB7777");
    expect(json.data.edited).toBe(false);
  });

  it("rejects updating weight on device pending entry", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: 25000 }),
    });

    const existingEntry = {
      id: 10,
      status: EntryStatus.PENDING,
      source: EntrySource.DEVICE,
      auto_approved: false,
      detected_vehicle_number: "KA01AB1111",
      vehicle_number: "KA01AB1111",
      weight: 20000,
      customer_id: null,
      center_id: 1,
      factory_id: 1,
      created_at: "2026-08-31T00:00:00Z",
    };

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: existingEntry, error: null }),
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
    expect(json.error).toBe("Cannot modify weight on a device entry.");
  });

  it("allows updating customer_id on manually approved entry when customer_id is null", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: 3 }),
    });

    const existingEntry = {
      id: 10,
      status: EntryStatus.APPROVED,
      source: EntrySource.MANUAL,
      auto_approved: false,
      detected_vehicle_number: null,
      vehicle_number: "KA01AB1111",
      customer_id: null,
      center_id: 1,
      factory_id: 1,
      created_at: "2026-08-31T00:00:00Z",
    };

    let fetchCount = 0;
    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "customers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 3 }, error: null }),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === "entries") {
          const query: Record<string, unknown> = {};
          query.select = vi.fn(() => query);
          query.eq = vi.fn(() => query);
          query.is = vi.fn(() => query);
          query.maybeSingle = vi.fn().mockImplementation(async () => {
            fetchCount++;
            if (fetchCount === 1) return { data: existingEntry, error: null };
            return { data: null, error: null };
          });
          query.single = vi.fn().mockResolvedValue({
            data: {
              ...existingEntry,
              customer_id: 3,
            },
            error: null,
          });
          query.update = vi.fn(() => query);
          return query;
        }
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
          })),
        };
      }),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.customer_id).toBe(3);
    expect(json.data.edited).toBe(false);
  });

  it("rejects approving an entry when vehicle_number is NO_PLATE_DETECTED", async () => {
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
                    status: EntryStatus.PENDING,
                    source: EntrySource.DEVICE,
                    vehicle_number: "NO_PLATE_DETECTED",
                    detected_vehicle_number: "NO_PLATE_DETECTED",
                    auto_approved: false,
                    customer_id: null,
                  },
                  error: null,
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
    expect(json.error).toBe(ApiErrorMessage.CANNOT_APPROVE_NO_PLATE);
  });

  it("disbands linked weighment and re-merges when auto-approved entry plate changes", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: "MH04AB1212" }),
    });

    const weighmentUpdateMock = vi.fn();
    let entryFetchCount = 0;
    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "entries") {
          const query: Record<string, unknown> = {};
          query.select = vi.fn(() => query);
          query.eq = vi.fn(() => query);
          query.is = vi.fn(() => query);
          query.lt = vi.fn(() => query);
          query.gt = vi.fn(() => query);
          query.neq = vi.fn(() => query);
          query.order = vi.fn(() => query);
          query.limit = vi.fn(() => query);
          query.maybeSingle = vi.fn().mockImplementation(async () => {
            entryFetchCount++;
            if (entryFetchCount === 1) {
              return {
                data: {
                  id: 10,
                  status: EntryStatus.APPROVED,
                  source: EntrySource.DEVICE,
                  auto_approved: true,
                  detected_vehicle_number: "MH12AB1234",
                  vehicle_number: "MH12AB1234",
                  customer_id: null,
                  center_id: 1,
                  created_at: "2026-08-31T10:00:00Z",
                },
                error: null,
              };
            }
            if (entryFetchCount === 2) {
              return { data: null, error: null };
            }
            if (entryFetchCount === 3) {
              return { data: { id: 20, vehicle_number: "MH12AB1234" }, error: null };
            }
            return { data: null, error: null };
          });
          query.single = vi.fn().mockResolvedValue({
            data: {
              id: 10,
              status: EntryStatus.APPROVED,
              source: EntrySource.DEVICE,
              auto_approved: true,
              detected_vehicle_number: "MH12AB1234",
              vehicle_number: "MH04AB1212",
              customer_id: null,
              center_id: 1,
              created_at: "2026-08-31T10:00:00Z",
            },
            error: null,
          });
          query.update = vi.fn(() => query);
          return query;
        }
        if (table === "weighments") {
          const query: Record<string, unknown> = {};
          query.select = vi.fn(() => query);
          query.or = vi.fn(() => query);
          query.eq = vi.fn(() => query);
          query.is = vi.fn(() => query);
          query.maybeSingle = vi.fn().mockResolvedValue({
            data: {
              id: 99,
              in_entry_id: 10,
              out_entry_id: 20,
            },
            error: null,
          });
          query.update = vi.fn((payload) => {
            weighmentUpdateMock(payload);
            return query;
          });
          return query;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.vehicle_number).toBe("MH04AB1212");
    expect(json.data.edited).toBe(true);
    expect(weighmentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      }),
    );
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
