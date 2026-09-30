import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateSessionToken,
  createSession,
  refreshSessionExpiry,
  validateSession,
  deleteSession,
  deleteAllUserSessions,
  clearSessionCache,
} from "./session";
import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import { Role } from "@/lib/constants/enums";

describe("lib/auth/session", () => {
  let mockClient: any;

  beforeEach(() => {
    clearSessionCache();
    mockClient = {
      from: vi.fn(),
    };
  });

  describe("generateSessionToken", () => {
    it("generates a 64-character hexadecimal token", () => {
      const token = generateSessionToken();
      expect(typeof token).toBe("string");
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it("generates unique tokens on consecutive calls", () => {
      const tokenA = generateSessionToken();
      const tokenB = generateSessionToken();
      expect(tokenA).not.toBe(tokenB);
    });
  });

  describe("createSession", () => {
    it("creates a session in the database with default SESSION_MAX_AGE_SECONDS", async () => {
      let insertedPayload: any;
      mockClient.from.mockReturnValue({
        insert: vi.fn((payload) => {
          insertedPayload = payload;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 42, token: payload.token },
                error: null,
              }),
            }),
          };
        }),
      });

      const before = Date.now();
      const result = await createSession(10, {}, mockClient);
      const after = Date.now();

      expect(mockClient.from).toHaveBeenCalledWith("sessions");
      expect(result).toEqual({ id: 42, token: insertedPayload.token });
      expect(insertedPayload.user_id).toBe(10);
      expect(insertedPayload.deleted_at).toBeNull();

      const expiresAtMs = new Date(insertedPayload.expires_at).getTime();
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + SESSION_MAX_AGE_SECONDS * 1000);
      expect(expiresAtMs).toBeLessThanOrEqual(after + SESSION_MAX_AGE_SECONDS * 1000 + 1000);
    });

    it("creates a session with custom expiresInSeconds", async () => {
      let insertedPayload: any;
      mockClient.from.mockReturnValue({
        insert: vi.fn((payload) => {
          insertedPayload = payload;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 1, token: payload.token },
                error: null,
              }),
            }),
          };
        }),
      });

      const before = Date.now();
      await createSession(5, { expiresInSeconds: 120 }, mockClient);

      const expiresAtMs = new Date(insertedPayload.expires_at).getTime();
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + 120 * 1000);
      expect(expiresAtMs).toBeLessThanOrEqual(before + 122 * 1000);
    });

    it("throws an error when insertion fails", async () => {
      mockClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database connection refused" },
            }),
          }),
        }),
      });

      await expect(createSession(1, {}, mockClient)).rejects.toThrow(
        "Failed to create session: Database connection refused",
      );
    });
  });

  describe("refreshSessionExpiry", () => {
    it("updates expires_at with sliding window for active session", async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockClient.from.mockReturnValue({ update: updateMock });

      const before = Date.now();
      await refreshSessionExpiry("token-123", mockClient);

      expect(mockClient.from).toHaveBeenCalledWith("sessions");
      expect(updateMock).toHaveBeenCalled();
      const updatedData = updateMock.mock.calls[0][0];
      const expiresAtMs = new Date(updatedData.expires_at).getTime();
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + SESSION_MAX_AGE_SECONDS * 1000);
    });

    it("ignores empty or non-string tokens gracefully", async () => {
      await refreshSessionExpiry("", mockClient);
      await refreshSessionExpiry(null as any, mockClient);
      expect(mockClient.from).not.toHaveBeenCalled();
    });
  });

  describe("validateSession", () => {
    it("returns null for empty or whitespace token", async () => {
      expect(await validateSession("", mockClient)).toBeNull();
      expect(await validateSession("   ", mockClient)).toBeNull();
      expect(mockClient.from).not.toHaveBeenCalled();
    });

    it("returns AuthUserPayload for valid active session", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    token: "valid-token",
                    user_id: 10,
                    expires_at: new Date(Date.now() + 100000).toISOString(),
                    deleted_at: null,
                    users: {
                      id: 10,
                      username: "operator_01",
                      name: "Operator One",
                      role: "operator",
                      factory_id: 2,
                      deleted_at: null,
                      factories: { name: "Main Factory", receipt_images_per_row: 2 },
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const user = await validateSession("valid-token", mockClient);
      expect(user).toEqual({
        sub: "10",
        username: "operator_01",
        name: "Operator One",
        role: Role.OPERATOR,
        factory_id: 2,
        factory_name: "Main Factory",
        receipt_images_per_row: 2,
      });
    });

    it("handles users array format gracefully", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    token: "valid-token",
                    user_id: 10,
                    expires_at: new Date(Date.now() + 100000).toISOString(),
                    deleted_at: null,
                    users: [
                      {
                        id: 10,
                        username: "admin_01",
                        name: "Admin",
                        role: "admin",
                        factory_id: 1,
                        deleted_at: null,
                        factories: null,
                      },
                    ],
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const user = await validateSession("valid-token", mockClient);
      expect(user?.role).toBe(Role.ADMIN);
      expect(user?.factory_name).toBeUndefined();
    });

    it("returns null when session is not found or database errors", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Query error" },
                }),
              }),
            }),
          }),
        }),
      });

      expect(await validateSession("missing-token", mockClient)).toBeNull();
    });

    it("returns null when user account is soft-deleted", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    token: "valid-token",
                    user_id: 10,
                    deleted_at: null,
                    users: {
                      id: 10,
                      username: "deactivated",
                      name: "Deactivated User",
                      role: "base",
                      factory_id: 1,
                      deleted_at: new Date().toISOString(),
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      expect(await validateSession("valid-token", mockClient)).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("soft-deletes active session by token", async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });
      mockClient.from.mockReturnValue({ update: updateMock });

      await deleteSession("token-to-delete", mockClient);

      expect(mockClient.from).toHaveBeenCalledWith("sessions");
      expect(updateMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith("token", "token-to-delete");
      const updatedFields = updateMock.mock.calls[0][0];
      expect(updatedFields.deleted_at).toBeDefined();
      expect(updatedFields.updated_at).toBeDefined();
    });

    it("ignores empty token", async () => {
      await deleteSession("", mockClient);
      expect(mockClient.from).not.toHaveBeenCalled();
    });
  });

  describe("deleteAllUserSessions", () => {
    it("soft-deletes all sessions belonging to user_id", async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });
      mockClient.from.mockReturnValue({ update: updateMock });

      await deleteAllUserSessions(42, mockClient);

      expect(mockClient.from).toHaveBeenCalledWith("sessions");
      expect(updateMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith("user_id", 42);
      const updatedFields = updateMock.mock.calls[0][0];
      expect(updatedFields.deleted_at).toBeDefined();
      expect(updatedFields.updated_at).toBeDefined();
    });

    it("ignores falsy or zero user_id", async () => {
      await deleteAllUserSessions(0, mockClient);
      expect(mockClient.from).not.toHaveBeenCalled();
    });
  });

  describe("sessionCache and instant invalidation", () => {
    const mockSessionRow = {
      id: 1,
      token: "cache-token-1",
      user_id: 88,
      expires_at: new Date(Date.now() + 100000).toISOString(),
      deleted_at: null,
      users: {
        id: 88,
        username: "cached_user",
        name: "Cached User",
        role: "admin",
        factory_id: 1,
        deleted_at: null,
        factories: { name: "Factory X" },
      },
    };

    it("serves subsequent requests from memory without hitting the database", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockSessionRow,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // First call - cache miss, hits database
      const first = await validateSession("cache-token-1", mockClient);
      expect(first?.username).toBe("cached_user");
      expect(mockClient.from).toHaveBeenCalledTimes(1);

      // Second call - cache hit, should NOT call mockClient.from again
      const second = await validateSession("cache-token-1", mockClient);
      expect(second?.username).toBe("cached_user");
      expect(mockClient.from).toHaveBeenCalledTimes(1);
    });

    it("immediately evicts cached token on deleteSession (logout)", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockSessionRow,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await validateSession("cache-token-1", mockClient);
      expect(mockClient.from).toHaveBeenCalledTimes(1);

      // Logout
      await deleteSession("cache-token-1", mockClient);

      // Next validateSession should miss cache and attempt database query
      await validateSession("cache-token-1", mockClient);
      expect(mockClient.from).toHaveBeenCalledTimes(3);
    });

    it("immediately evicts all user tokens on deleteAllUserSessions (password change)", async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockSessionRow,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await validateSession("cache-token-1", mockClient);
      expect(mockClient.from).toHaveBeenCalledTimes(1);

      // Admin changes password -> deleteAllUserSessions(88)
      await deleteAllUserSessions(88, mockClient);

      // Next request must miss cache and hit database
      await validateSession("cache-token-1", mockClient);
      expect(mockClient.from).toHaveBeenCalledTimes(3);
    });
  });
});
