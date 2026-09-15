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
    factory_id: number;
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

  it("successfully updates user", async () => {
    mockHasPermission.mockReturnValue(true);
    const updateRequest = new Request("http://localhost/api/users/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
        role: Role.OPERATOR,
      }),
    });

    const existingUser = {
      id: 1,
      name: "Self User",
      role: Role.OPERATOR,
      factory_id: 1,
    };
    const updatedUser = {
      id: 1,
      name: "Updated Name",
      role: Role.OPERATOR,
      factory_id: 1,
    };

    const updateMockDb = {
      from: vi.fn((_table: string) => {
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
  });

  it("rejects self-deletion with 403", async () => {
    mockHasPermission.mockReturnValue(true);
    const ownUser = {
      sub: "1",
      username: "operator",
      role: Role.OPERATOR,
      factory_id: 1,
    };

    const selfMockDb = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.is = vi.fn(() => chain);
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1, role: Role.BASE } });
        return chain;
      }),
    };

    const deleteHandler = DELETE as unknown as RawUserHandler;
    const response = await deleteHandler(request, ownUser, selfMockDb, context);

    expect(response.status).toBe(403);
  });

  it("rejects deletion of an admin user with 403", async () => {
    mockHasPermission.mockReturnValue(true);
    const actorAdmin = {
      sub: "99",
      username: "admin",
      role: Role.ADMIN,
      factory_id: 1,
    };

    const adminTargetMockDb = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.is = vi.fn(() => chain);
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1, role: Role.ADMIN } });
        return chain;
      }),
    };

    const deleteHandler = DELETE as unknown as RawUserHandler;
    const response = await deleteHandler(request, actorAdmin, adminTargetMockDb, context);

    expect(response.status).toBe(403);
  });

  it("purges all active user sessions when password is changed", async () => {
    mockHasPermission.mockReturnValue(true);
    const updateRequest = new Request("http://localhost/api/users/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "new_secure_password_123",
        confirmPassword: "new_secure_password_123",
      }),
    });

    const existingUser = {
      id: 1,
      name: "User 1",
      role: Role.OPERATOR,
      factory_id: 1,
    };
    const updatedUser = {
      id: 1,
      name: "User 1",
      role: Role.OPERATOR,
      factory_id: 1,
    };

    const sessionDeleteSpy = vi.fn();
    const mockDbWithSessions = {
      from: vi.fn((table: string) => {
        if (table === "sessions") {
          const sessionChain: Record<string, unknown> = {};
          sessionChain.delete = vi.fn(() => sessionChain);
          sessionChain.update = vi.fn(() => sessionChain);
          sessionChain.eq = vi.fn((field: string, val: unknown) => {
            sessionDeleteSpy(field, val);
            return Promise.resolve({ data: null, error: null });
          });
          return sessionChain;
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
    const response = await patchHandler(updateRequest, sampleUser, mockDbWithSessions, context);

    expect(response.status).toBe(200);
    expect(sessionDeleteSpy).toHaveBeenCalledWith("user_id", 1);
  });

  it("marks is_self_password_changed and clears auth cookies when own password is changed", async () => {
    mockHasPermission.mockReturnValue(true);
    const ownUser = {
      sub: "1",
      username: "operator",
      role: Role.OPERATOR,
      factory_id: 1,
    };
    const updateRequest = new Request("http://localhost/api/users/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "new_secure_password_123",
        confirmPassword: "new_secure_password_123",
      }),
    });

    const existingUser = {
      id: 1,
      name: "User 1",
      role: Role.OPERATOR,
      factory_id: 1,
    };
    const updatedUser = {
      id: 1,
      name: "User 1",
      role: Role.OPERATOR,
      factory_id: 1,
    };

    const sessionDeleteSpy = vi.fn();
    const mockDbWithSessions = {
      from: vi.fn((table: string) => {
        if (table === "sessions") {
          const sessionChain: Record<string, unknown> = {};
          sessionChain.delete = vi.fn(() => sessionChain);
          sessionChain.update = vi.fn(() => sessionChain);
          sessionChain.eq = vi.fn((field: string, val: unknown) => {
            sessionDeleteSpy(field, val);
            return Promise.resolve({ data: null, error: null });
          });
          return sessionChain;
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
    const response = await patchHandler(updateRequest, ownUser, mockDbWithSessions, context);

    expect(response.status).toBe(200);
    expect(sessionDeleteSpy).toHaveBeenCalledWith("user_id", 1);
    const json = await response.json();
    expect(json.is_self_password_changed).toBe(true);
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("Max-Age=0");
  });

  it("purges all active user sessions when user is soft deleted", async () => {
    mockHasPermission.mockReturnValue(true);
    const adminActor = {
      sub: "99",
      username: "admin",
      role: Role.ADMIN,
      factory_id: 1,
    };

    const sessionDeleteSpy = vi.fn();
    const selfMockDb = {
      from: vi.fn((table: string) => {
        if (table === "sessions") {
          const sessionChain: Record<string, unknown> = {};
          sessionChain.delete = vi.fn(() => sessionChain);
          sessionChain.update = vi.fn(() => sessionChain);
          sessionChain.eq = vi.fn((field: string, val: unknown) => {
            sessionDeleteSpy(field, val);
            return Promise.resolve({ data: null, error: null });
          });
          return sessionChain;
        }
        if (table === "entries" || table === "customers") {
          const checkChain: Record<string, unknown> = {};
          checkChain.select = vi.fn(() => checkChain);
          checkChain.eq = vi.fn(() => checkChain);
          checkChain.or = vi.fn(() => checkChain);
          checkChain.is = vi.fn(() => checkChain);
          checkChain.limit = vi.fn(() => checkChain);
          checkChain.maybeSingle = vi.fn().mockResolvedValue({ data: null });
          return checkChain;
        }

        const userChain: Record<string, unknown> = {};
        userChain.select = vi.fn(() => userChain);
        userChain.eq = vi.fn(() => userChain);
        userChain.is = vi.fn(() => userChain);
        // Target is Base user (id: 1), actor is Admin (sub: "99")
        userChain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1, role: Role.BASE } });
        userChain.update = vi.fn(() => userChain);
        return userChain;
      }),
    };

    const deleteHandler = DELETE as unknown as RawUserHandler;
    const response = await deleteHandler(request, adminActor, selfMockDb, context);

    expect(response.status).toBe(200);
    expect(sessionDeleteSpy).toHaveBeenCalledWith("user_id", 1);
  });

  it("rejects updating user role to invalid role", async () => {
    mockHasPermission.mockReturnValue(true);
    const updateRequest = new Request("http://localhost/api/users/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "hardware",
      }),
    });

    const patchHandler = PATCH as unknown as RawUserHandler;
    const response = await patchHandler(updateRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("Invalid role selected");
  });
});
