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

import { GET, POST } from "./route";
import { GET as GET_ONE, PATCH, DELETE } from "./[id]/route";

type RawHandler = (
  request: Request,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const adminUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const operatorUser = { sub: "2", role: Role.OPERATOR, factory_id: 1 };
const baseUser = { sub: "3", role: Role.BASE, factory_id: 1 };
const context = { params: Promise.resolve({}) };

describe("Tickets API route handlers (/api/tickets)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tickets", () => {
    it("rejects base and hardware roles", async () => {
      const req = new NextRequest("http://localhost/api/tickets");
      const response = await (GET as unknown as RawHandler)(req, baseUser, {}, context);
      expect(response.status).toBe(403);
    });

    it("fetches tickets filtered by factory", async () => {
      const mockQuery: Record<string, unknown> = {};
      mockQuery.select = vi.fn(() => mockQuery);
      mockQuery.order = vi.fn(() => mockQuery);
      mockQuery.eq = vi.fn(() => mockQuery);
      mockQuery.is = vi.fn(() => mockQuery);
      mockQuery.range = vi.fn().mockResolvedValue({
        data: [
          {
            id: 101,
            concern: "Weight issue on vehicle",
            status: TicketStatus.PENDING,
            entry_id: 1,
            weighment_id: null,
            user_id: 2,
            users: { id: 2, name: "Operator", username: "op1", factory_id: 1 },
          },
        ],
        count: 1,
        error: null,
      });

      const mockDb = { from: vi.fn(() => mockQuery) };
      const req = new NextRequest("http://localhost/api/tickets?status=pending&user_id=2");
      const response = await (GET as unknown as RawHandler)(req, adminUser, mockDb, context);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(101);
      expect(mockQuery.eq).toHaveBeenCalledWith("users.factory_id", 1);
      expect(mockQuery.eq).toHaveBeenCalledWith("status", "pending");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", 2);
    });
  });

  describe("POST /api/tickets", () => {
    it("rejects base users from creating tickets", async () => {
      const req = new NextRequest("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({ entry_id: 1, concern: "Something is wrong here" }),
      });
      const response = await (POST as unknown as RawHandler)(req, baseUser, {}, context);
      expect(response.status).toBe(403);
    });

    it("creates ticket linked to an entry", async () => {
      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "entries") {
            const q: Record<string, unknown> = {};
            q.select = vi.fn(() => q);
            q.eq = vi.fn(() => q);
            q.is = vi.fn(() => q);
            q.maybeSingle = vi.fn().mockResolvedValue({
              data: { id: 1, factory_id: 1 },
              error: null,
            });
            return q;
          }
          if (table === "tickets") {
            const q: Record<string, unknown> = {};
            q.insert = vi.fn(() => q);
            q.select = vi.fn(() => q);
            q.single = vi.fn().mockResolvedValue({
              data: {
                id: 102,
                concern: "Discrepancy on gross weight",
                status: TicketStatus.PENDING,
                entry_id: 1,
                weighment_id: null,
                user_id: 2,
              },
              error: null,
            });
            return q;
          }
          return {};
        }),
      };

      const req = new NextRequest("http://localhost/api/tickets", {
        method: "POST",
        body: JSON.stringify({ entry_id: 1, concern: "Discrepancy on gross weight" }),
      });

      const response = await (POST as unknown as RawHandler)(req, operatorUser, mockDb, context);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.id).toBe(102);
      expect(json.data.status).toBe(TicketStatus.PENDING);
    });
  });

  describe("GET /api/tickets/[id]", () => {
    it("fetches single ticket for authorized factory user", async () => {
      const mockDb = {
        from: vi.fn(() => {
          const q: Record<string, unknown> = {};
          q.select = vi.fn(() => q);
          q.eq = vi.fn(() => q);
          q.is = vi.fn(() => q);
          q.maybeSingle = vi.fn().mockResolvedValue({
            data: { id: 101, concern: "Valid concern", users: { factory_id: 1 } },
            error: null,
          });
          return q;
        }),
      };

      const req = new NextRequest("http://localhost/api/tickets/101");
      const response = await (GET_ONE as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(101);
    });
  });

  describe("PATCH /api/tickets/[id]", () => {
    it("blocks updating ticket status via application", async () => {
      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ status: TicketStatus.APPROVED }),
      });
      const response = await (PATCH as unknown as RawHandler)(
        req,
        adminUser,
        {},
        { params: Promise.resolve({ id: "101" }) },
      );
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain(
        "Ticket status and reply cannot be modified via the application",
      );
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
              data: { id: 101, user_id: 2, status: TicketStatus.PENDING, users: { factory_id: 1 } },
              error: null,
            });
            q.update = vi.fn(() => q);
            q.single = vi.fn().mockResolvedValue({
              data: { id: 101, concern: "Updated concern description here", user_id: 2 },
              error: null,
            });
            return q;
          }
          return {};
        }),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", {
        method: "PATCH",
        body: JSON.stringify({ concern: "Updated concern description here" }),
      });

      const response = await (PATCH as unknown as RawHandler)(req, operatorUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.concern).toBe("Updated concern description here");
    });

    it("blocks non-owner from editing another user's ticket", async () => {
      const anotherOperator = { sub: "99", role: Role.OPERATOR, factory_id: 1 };
      const mockDb = {
        from: vi.fn(() => {
          const q: Record<string, unknown> = {};
          q.select = vi.fn(() => q);
          q.eq = vi.fn(() => q);
          q.is = vi.fn(() => q);
          q.maybeSingle = vi.fn().mockResolvedValue({
            data: { id: 101, user_id: 2, status: TicketStatus.PENDING, users: { factory_id: 1 } },
            error: null,
          });
          return q;
        }),
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
  });

  describe("DELETE /api/tickets/[id]", () => {
    it("allows admin to delete any ticket", async () => {
      const mockDb = {
        from: vi.fn(() => {
          const q: Record<string, unknown> = {};
          q.select = vi.fn(() => q);
          q.eq = vi.fn(() => q);
          q.is = vi.fn(() => q);
          q.maybeSingle = vi.fn().mockResolvedValue({
            data: { id: 101, user_id: 2, users: { factory_id: 1 } },
            error: null,
          });
          q.update = vi.fn(() => q);
          return q;
        }),
      };

      const req = new NextRequest("http://localhost/api/tickets/101", { method: "DELETE" });
      const response = await (DELETE as unknown as RawHandler)(req, adminUser, mockDb, {
        params: Promise.resolve({ id: "101" }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });
});
