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

type RawProfileHandler = (
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
const request = new Request("http://localhost/api/profiles/1");

const mockDb = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 999, name: "Other User" },
          }),
        })),
      })),
    })),
  })),
};

describe("Profile mutation guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["PATCH", PATCH as unknown as RawProfileHandler, PermissionKey.WRITE],
    ["DELETE", DELETE as unknown as RawProfileHandler, PermissionKey.DELETE],
  ])(
    "rejects %s when the user lacks the required permission",
    async (_method, handler, permission) => {
      mockHasPermission.mockReturnValue(false);

      const response = await handler(request, sampleUser, mockDb, context);

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(sampleUser, ProjectSlug.PROFILES, permission);
    },
  );
});
