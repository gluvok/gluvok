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

type RawUserHandler = (
  request: Request,
  user: {
    sub: string;
    username: string;
    role: Role;
    factory_id: number | null;
  },
  db: unknown,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

const sampleUser = {
  sub: "user-1",
  username: "operator",
  role: Role.OPERATOR,
  factory_id: 1,
};

const context = { params: Promise.resolve({ id: "1" }) };
const request = new Request("http://localhost/api/users/1");

const mockDb = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 999, name: "Other User" },
            }),
          })),
        })),
      })),
    })),
  })),
};

describe("User mutation guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["PATCH", PATCH as unknown as RawUserHandler, PermissionKey.WRITE],
    ["DELETE", DELETE as unknown as RawUserHandler, PermissionKey.DELETE],
  ])(
    "rejects %s when the user lacks the required permission",
    async (_method, handler, permission) => {
      mockHasPermission.mockReturnValue(false);

      const response = await handler(request, sampleUser, mockDb, context);

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(sampleUser, ProjectSlug.USERS, permission);
    },
  );

  it("successfully updates user and returns factory metadata", async () => {
    mockHasPermission.mockReturnValue(true);
    const updateRequest = new Request("http://localhost/api/users/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
        role: Role.OPERATOR,
        aadhar_number: "123456789012",
      }),
    });

    const existingUser = {
      id: 1,
      name: "Self User",
      aadhar_number: "123456789012",
      role: Role.OPERATOR,
      factory_id: 1,
    };
    const updatedUser = {
      id: 1,
      name: "Updated Name",
      aadhar_number: "123456789012",
      role: Role.OPERATOR,
      factory_id: 1,
    };
    const factoryData = {
      id: 1,
      name: "Factory A",
      aadhar_number_mode: "mandatory",
      govt_id_mode: "mandatory",
    };

    const updateMockDb = {
      from: vi.fn((table: string) => {
        if (table === "factories") {
          const factoryChain: Record<string, unknown> = {};
          factoryChain.select = vi.fn(() => factoryChain);
          factoryChain.eq = vi.fn(() => factoryChain);
          factoryChain.maybeSingle = vi.fn().mockResolvedValue({ data: factoryData });
          return factoryChain;
        }

        const userChain: Record<string, unknown> = {};
        userChain.select = vi.fn(() => userChain);
        userChain.eq = vi.fn(() => userChain);
        userChain.neq = vi.fn(() => userChain);
        userChain.is = vi.fn(() => userChain);
        userChain.maybeSingle = vi.fn().mockResolvedValue({ data: existingUser });
        userChain.update = vi.fn(() => userChain);
        userChain.single = vi.fn().mockResolvedValue({ data: updatedUser, error: null });
        return userChain;
      }),
    };

    const patchHandler = PATCH as unknown as RawUserHandler;
    const response = await patchHandler(updateRequest, sampleUser, updateMockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.name).toBe("Updated Name");
    expect(json.factory).toBeDefined();
    expect(json.factory.id).toBe(1);
  });

  it("allows self deletion and marks is_self_deleted while clearing cookies", async () => {
    const ownUser = {
      sub: "1",
      username: "operator",
      role: Role.OPERATOR,
      factory_id: 1,
    };

    const selfMockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 1, name: "Self User" },
                }),
              })),
            })),
            is: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        })),
      })),
    };

    const deleteHandler = DELETE as unknown as RawUserHandler;
    const response = await deleteHandler(request, ownUser, selfMockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true, id: 1, is_self_deleted: true });
    expect(response.headers.get("set-cookie")).toBeDefined();
  });
});
