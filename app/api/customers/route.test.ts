import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
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
    it("rejects when user lacks CREATE permission", async () => {
      mockHasPermission.mockReturnValue(false);
      const req = new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Ajay", father_name: "Vijay" }),
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
        user_id: null,
        factory_id: 1,
      };

      const mockDb = {
        from: vi.fn(() => ({})),
        rpc: vi.fn().mockResolvedValue({ data: createdCustomer, error: null }),
      };

      const req = new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: "Ajay Kumar",
          father_name: "Vijay Kumar",
        }),
      });

      const handler = POST as unknown as RawHandler;
      const response = await handler(req, sampleUser, mockDb, context);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.name).toBe("Ajay Kumar");
      expect(mockDb.rpc).toHaveBeenCalledWith("create_customer_with_user", {
        p_factory_id: 1,
        p_name: "Ajay Kumar",
        p_father_name: "Vijay Kumar",
        p_username: null,
        p_password_hash: null,
      });
    });
  });
});
