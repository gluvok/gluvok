import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
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

import { GET, POST } from "./route";

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
  username: "operator",
  role: Role.OPERATOR,
  factory_id: 1,
};

const context = { params: Promise.resolve({}) };

describe("Customers route handlers (/api/customers)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  describe("GET /api/customers", () => {
    it("rejects when user lacks READ permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/customers");
      const handler = GET as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sampleUser,
        ProjectSlug.CUSTOMERS,
        PermissionKey.READ,
      );
    });
  });

  describe("POST /api/customers", () => {
    const factoryData = {
      id: 1,
      name: "Factory A",
      aadhar_number_mode: "mandatory",
      govt_id_mode: "mandatory",
    };

    it("rejects when user lacks CREATE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Ajay", father_name: "Vijay", govt_id: 101 }),
      });
      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, {}, context);

      expect(response.status).toBe(403);
    });

    it("successfully creates a customer without user credentials", async () => {
      const createdCustomer = {
        id: 10,
        name: "Ajay Kumar",
        father_name: "Vijay Kumar",
        govt_id: 101,
        user_id: null,
        factory_id: 1,
      };

      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "factories") {
            const chain: Record<string, unknown> = {};
            chain.select = vi.fn(() => chain);
            chain.eq = vi.fn(() => chain);
            chain.maybeSingle = vi.fn().mockResolvedValue({ data: factoryData });
            return chain;
          }
          if (table === "customers") {
            const chain: Record<string, unknown> = {};
            chain.select = vi.fn(() => chain);
            chain.eq = vi.fn(() => chain);
            chain.is = vi.fn(() => chain);
            chain.maybeSingle = vi.fn().mockResolvedValue({ data: null });
            return chain;
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({ data: createdCustomer, error: null }),
      };

      const req = new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: "Ajay Kumar",
          father_name: "Vijay Kumar",
          govt_id: 101,
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, mockDb, context);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.name).toBe("Ajay Kumar");
      expect(json.factory).toBeDefined();
      expect(mockDb.rpc).toHaveBeenCalledWith("create_customer_with_user", {
        p_factory_id: 1,
        p_name: "Ajay Kumar",
        p_father_name: "Vijay Kumar",
        p_govt_id: 101,
        p_username: null,
        p_password_hash: null,
      });
    });

    it("rejects duplicate govt_id", async () => {
      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === "factories") {
            const chain: Record<string, unknown> = {};
            chain.select = vi.fn(() => chain);
            chain.eq = vi.fn(() => chain);
            chain.maybeSingle = vi.fn().mockResolvedValue({ data: factoryData });
            return chain;
          }
          if (table === "customers") {
            const chain: Record<string, unknown> = {};
            chain.select = vi.fn(() => chain);
            chain.eq = vi.fn(() => chain);
            chain.is = vi.fn(() => chain);
            chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 5 } });
            return chain;
          }
          return {};
        }),
      };

      const req = new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: "Ajay Kumar",
          father_name: "Vijay Kumar",
          govt_id: 101,
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, mockDb, context);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe(ApiErrorMessage.GOVT_ID_EXISTS);
    });
  });
});
