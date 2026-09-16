import { describe, expect, it, vi, beforeEach } from "vitest";
import { Role, TicketStatus } from "@/lib/constants/enums";
import { NextRequest } from "next/server";

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
  };
});

import { GET, PATCH, DELETE } from "./route";

type RawHandler = (
  request: Request,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const adminUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const operatorUser = { sub: "2", role: Role.OPERATOR, factory_id: 1 };
const anotherOperator = { sub: "99", role: Role.OPERATOR, factory_id: 1 };
const baseUser = { sub: "3", role: Role.BASE, factory_id: 1 };

describe("Tickets [id] API route handlers (/api/tickets/[id])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tickets/[id]", () => {
    it("rejects unauthorized base users", async () => {
      const req = new NextRequest("http://localhost/api/tickets/101");
      const response = await (GET as unknown as RawHandler)(
        req,
        baseUser,
        {},
        {
          params: Promise.resolve({ id: "101" }),
        },
      );
      expect(response.status).toBe(403);
    });

    it("rejects invalid non-numeric ticket ID", async () => {
      const req = new NextRequest("http://localhost/api/tickets/abc");
      const response = await (GET as unknown as RawHandler)(
        req,
        operatorUser,
        {},
        {
          params: Promise.resolve({ id: "abc" }),
        },
      );
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Invalid ticket identifier");
    });

    it("returns 404 when ticket is not found or belongs to another factory", async () => {
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

      const req = new NextRequest("http://localhost/api/tickets/999");
      const response = await (GET as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "999" }),
      });
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe("Ticket not found");
    });

    it("fetches single ticket for authorized factory user", async () => {
      const mockDb = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 101, concern: "Valid concern", users: { factory_id: 1 } },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      const req = new NextRequest("http://localhost/api/tickets/101");
      const response = await (GET as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(101);
      expect(json.data.concern).toBe("Valid concern");
    });
  });

  describe("PATCH /api/tickets/[id]", () => {
    it("rejects unauthorized base users", async () => {
      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ concern: "New concern" }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        req,
        baseUser,
        {},
        {
          params: Promise.resolve({ id: "101" }),
        },
      );
      expect(response.status).toBe(403);
    });

    it("rejects non-numeric ticket ID", async () => {
      const req = new NextRequest("http://localhost/api/tickets/invalid", {
        method: "PATCH",
        body: JSON.stringify({ concern: "New concern" }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        req,
        operatorUser,
        {},
        {
          params: Promise.resolve({ id: "invalid" }),
        },
      );
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Invalid ticket identifier");
    });

    it("blocks updating ticket status or reply via application", async () => {
      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ status: TicketStatus.APPROVED }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        req,
        adminUser,
        {},
        {
          params: Promise.resolve({ id: "101" }),
        },
      );
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain(
        "Ticket status and reply cannot be modified via the application",
      );
    });

    it("rejects invalid concern schema validation", async () => {
      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ concern: "" }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        req,
        operatorUser,
        {},
        {
          params: Promise.resolve({ id: "101" }),
        },
      );
      expect(response.status).toBe(400);
    });

    it("returns 404 when target ticket does not exist", async () => {
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

      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ concern: "Valid concern" }),
      });
      const response = await (PATCH as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(404);
    });

    it("blocks non-owner from editing another user's ticket", async () => {
      const mockDb = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 101,
                      user_id: 2,
                      status: TicketStatus.PENDING,
                      users: { factory_id: 1 },
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ concern: "Attempted hijack of ticket" }),
      });

      const response = await (PATCH as unknown as RawHandler)(req, anotherOperator, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(403);
    });

    it("allows owner to edit their concern", async () => {
      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "tickets") {
            const q: Record<string, unknown> = {};
            q.select = vi.fn(() => q);
            q.eq = vi.fn(() => q);
            q.is = vi.fn(() => q);
            q.maybeSingle = vi.fn().mockResolvedValue({
              data: {
                id: 101,
                user_id: 2,
                status: TicketStatus.PENDING,
                users: { factory_id: 1 },
              },
              error: null,
            });
            q.update = vi.fn(() => q);
            q.single = vi.fn().mockResolvedValue({
              data: { id: 101, concern: "Updated concern description", user_id: 2 },
              error: null,
            });
            return q;
          }
          return {};
        }),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ concern: "Updated concern description" }),
      });

      const response = await (PATCH as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.concern).toBe("Updated concern description");
    });

    it("allows admin to edit concern on any ticket", async () => {
      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "tickets") {
            const q: Record<string, unknown> = {};
            q.select = vi.fn(() => q);
            q.eq = vi.fn(() => q);
            q.is = vi.fn(() => q);
            q.maybeSingle = vi.fn().mockResolvedValue({
              data: {
                id: 101,
                user_id: 2,
                status: TicketStatus.PENDING,
                users: { factory_id: 1 },
              },
              error: null,
            });
            q.update = vi.fn(() => q);
            q.single = vi.fn().mockResolvedValue({
              data: { id: 101, concern: "Admin edited concern", user_id: 2 },
              error: null,
            });
            return q;
          }
          return {};
        }),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ concern: "Admin edited concern" }),
      });

      const response = await (PATCH as unknown as RawHandler)(req, adminUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.concern).toBe("Admin edited concern");
    });
  });

  describe("DELETE /api/tickets/[id]", () => {
    it("rejects unauthorized base users", async () => {
      const req = new NextRequest("http://localhost/api/tickets/101", { method: "DELETE" });
      const response = await (DELETE as unknown as RawHandler)(
        req,
        baseUser,
        {},
        {
          params: Promise.resolve({ id: "101" }),
        },
      );
      expect(response.status).toBe(403);
    });

    it("rejects non-numeric ticket ID", async () => {
      const req = new NextRequest("http://localhost/api/tickets/abc", { method: "DELETE" });
      const response = await (DELETE as unknown as RawHandler)(
        req,
        operatorUser,
        {},
        {
          params: Promise.resolve({ id: "abc" }),
        },
      );
      expect(response.status).toBe(400);
    });

    it("returns 404 when ticket does not exist", async () => {
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

      const req = new NextRequest("http://localhost/api/tickets/101", { method: "DELETE" });
      const response = await (DELETE as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(404);
    });

    it("blocks non-owner non-admin from deleting ticket", async () => {
      const mockDb = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 101, user_id: 2, users: { factory_id: 1 } },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", { method: "DELETE" });
      const response = await (DELETE as unknown as RawHandler)(req, anotherOperator, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(403);
    });

    it("allows admin to delete any ticket", async () => {
      const mockDb = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 101, user_id: 2, users: { factory_id: 1 } },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", { method: "DELETE" });
      const response = await (DELETE as unknown as RawHandler)(req, adminUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it("allows owner to delete their own ticket", async () => {
      const mockDb = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 101, user_id: 2, users: { factory_id: 1 } },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", { method: "DELETE" });
      const response = await (DELETE as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });
});
