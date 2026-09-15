import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Role } from "@/lib/constants/enums";

const { mockDb, mockVerifyPassword } = vi.hoisted(() => ({
  mockDb: {
    from: vi.fn(),
  },
  mockVerifyPassword: vi.fn(),
}));

vi.mock("@/db", () => ({
  supabase: mockDb,
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: mockVerifyPassword,
}));

import { hasDeviceCredentials, verifyDeviceRequest, hashDeviceKey } from "./device";

describe("lib/auth/device", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasDeviceCredentials", () => {
    it("detects Basic auth header", () => {
      const req = new NextRequest("http://localhost/api/entries", {
        headers: { authorization: "Basic Y2FtMTpzZWNyZXQ=" },
      });
      expect(hasDeviceCredentials(req)).toBe(true);
    });

    it("detects x-username and x-password headers", () => {
      const req = new NextRequest("http://localhost/api/entries", {
        headers: { "x-username": "cam1", "x-password": "secret" },
      });
      expect(hasDeviceCredentials(req)).toBe(true);
    });

    it("detects credentials in FormData", () => {
      const req = new NextRequest("http://localhost/api/entries");
      const formData = new FormData();
      formData.append("username", "cam1");
      formData.append("password", "secret");
      expect(hasDeviceCredentials(req, formData)).toBe(true);
    });

    it("returns false when no device credentials exist", () => {
      const req = new NextRequest("http://localhost/api/entries");
      expect(hasDeviceCredentials(req)).toBe(false);
    });
  });

  describe("verifyDeviceRequest", () => {
    it("returns 401 when credentials are missing", async () => {
      const req = new NextRequest("http://localhost/api/entries");
      const result = await verifyDeviceRequest(req, mockDb as any);
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toBe("Missing device credentials");
    });

    it("returns 403 when hardware user is not found", async () => {
      const req = new NextRequest("http://localhost/api/entries", {
        headers: { "x-username": "unknown_cam", "x-password": "secret" },
      });

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await verifyDeviceRequest(req, mockDb as any);
      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toBe("Unauthorized or disabled device");
    });

    it("returns 403 when password verification fails", async () => {
      const req = new NextRequest("http://localhost/api/entries", {
        headers: { "x-username": "cam1", "x-password": "wrong_password" },
      });

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 5,
                    username: "cam1",
                    role: Role.HARDWARE,
                    password_hash: "hashed_correct_pw",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockVerifyPassword.mockResolvedValue(false);

      const result = await verifyDeviceRequest(req, mockDb as any);
      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toBe("Invalid device credentials");
    });

    it("authenticates device via Basic Auth, updates heartbeat, and returns device", async () => {
      const basicHeader = `Basic ${Buffer.from("cam1:valid_secret").toString("base64")}`;
      const req = new NextRequest("http://localhost/api/entries", {
        headers: { authorization: basicHeader },
      });

      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

      mockDb.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 7,
                        username: "cam1",
                        role: Role.HARDWARE,
                        factory_id: 1,
                        password_hash: hashDeviceKey("valid_secret"),
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: updateMock,
          };
        }
        return {};
      });

      const result = await verifyDeviceRequest(req, mockDb as any);
      expect(result.success).toBe(true);
      expect(result.device?.id).toBe(7);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ updated_at: expect.any(String) }),
      );
      expect(updateEqMock).toHaveBeenCalledWith("id", 7);
    });

    it("authenticates device via FormData credentials", async () => {
      const req = new NextRequest("http://localhost/api/entries");
      const formData = new FormData();
      formData.append("username", "scale_device");
      formData.append("password", "argon_pass");

      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

      mockDb.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 9,
                        username: "scale_device",
                        role: Role.HARDWARE,
                        factory_id: 1,
                        password_hash: "$argon2id$v=19$...",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: updateMock,
          };
        }
        return {};
      });
      mockVerifyPassword.mockResolvedValue(true);

      const result = await verifyDeviceRequest(req, mockDb as any, formData);
      expect(result.success).toBe(true);
      expect(result.device?.id).toBe(9);
      expect(mockVerifyPassword).toHaveBeenCalledWith("argon_pass", "$argon2id$v=19$...");
    });
  });
});
