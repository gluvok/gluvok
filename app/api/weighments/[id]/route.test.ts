import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";

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

const context = { params: Promise.resolve({ id: "100" }) };

describe("Weighments [id] DELETE route handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("rejects DELETE when user lacks DELETE permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const deleteRequest = new Request("http://localhost/api/weighments/100", {
      method: "DELETE",
    });

    const mockDb = {
      from: vi.fn(),
    };

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith(
      sampleUser,
      ProjectSlug.WEIGHMENTS,
      PermissionKey.DELETE,
    );
  });

  it("returns 404 when weighment does not exist", async () => {
    const deleteRequest = new Request("http://localhost/api/weighments/100", {
      method: "DELETE",
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(404);
  });

  it("soft deletes weighment and cascades soft delete to in_entry and out_entry", async () => {
    const deleteRequest = new Request("http://localhost/api/weighments/100", {
      method: "DELETE",
    });

    const weighmentUpdateMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));

    const entriesUpdateMock = vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    }));

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "weighments") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 100,
                        in_entry_id: 10,
                        out_entry_id: 20,
                        in_entry: { factory_id: 1 },
                      },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
            update: weighmentUpdateMock,
          };
        }
        if (table === "entries") {
          return {
            update: entriesUpdateMock,
          };
        }
        return {};
      }),
    };

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.id).toBe(100);

    expect(weighmentUpdateMock).toHaveBeenCalled();
    expect(entriesUpdateMock).toHaveBeenCalled();
  });
});

describe("Weighments [id] PATCH route handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("updates weighment type when currently unassigned", async () => {
    const patchRequest = new Request("http://localhost/api/weighments/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "in" }),
    });

    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 100, type: "in" },
              error: null,
            }),
          })),
        })),
      })),
    }));

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 100, type: "unassigned", rate_id: null },
                error: null,
              }),
            })),
          })),
        })),
        update: updateMock,
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.type).toBe("in");
  });

  it("rejects modifying type if type is already set to 'in' or 'out'", async () => {
    const patchRequest = new Request("http://localhost/api/weighments/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "out" }),
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 100, type: "in", rate_id: null },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("type is already set");
  });

  it("updates weighment rate_id when currently null", async () => {
    const patchRequest = new Request("http://localhost/api/weighments/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate_id: 3 }),
    });

    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 100, type: "unassigned", rate_id: 3 },
              error: null,
            }),
          })),
        })),
      })),
    }));

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "weighments") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 100, type: "unassigned", rate_id: null },
                    error: null,
                  }),
                })),
              })),
            })),
            update: updateMock,
          };
        }
        if (table === "rates") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: 3, factory_id: 1 },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.rate_id).toBe(3);
  });

  it("rejects modifying rate_id if rate_id is already set", async () => {
    const patchRequest = new Request("http://localhost/api/weighments/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate_id: 4 }),
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 100, type: "unassigned", rate_id: 3 },
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("Rate is already set");
  });

  it("rejects modifying rate_id if rate does not exist in user's factory", async () => {
    const patchRequest = new Request("http://localhost/api/weighments/100", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate_id: 999 }),
    });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "weighments") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 100, type: "unassigned", rate_id: null },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === "rates") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("Rate not found or does not belong to your factory");
  });
});
