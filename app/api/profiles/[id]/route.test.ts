import { describe, expect, it, vi, beforeEach } from "vitest"
import { PermissionKey, ProjectSlug, Role, TenantMode } from "@/lib/constants/enums"

const { mockHasPermission } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
}))

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>()
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
    hasPermission: mockHasPermission,
  }
})

import { DELETE, PATCH } from "./route";

type RawProfileHandler = (
  request: Request,
  user: {
    sub: string
    username: string
    role: Role
    factory_id: number | null
    tenant_mode: TenantMode
  },
  db: unknown,
  mode: TenantMode,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>

const sharedUser = {
  sub: "user-1",
  username: "operator",
  role: Role.OPERATOR,
  factory_id: 1,
  tenant_mode: TenantMode.SHARED,
}

const context = { params: Promise.resolve({ id: "1" }) }
const request = new Request("http://localhost/api/profiles/1")

describe("Profile mutation guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["PATCH", PATCH as unknown as RawProfileHandler, PermissionKey.WRITE],
    ["DELETE", DELETE as unknown as RawProfileHandler, PermissionKey.DELETE],
  ])(
    "rejects %s when the user lacks the required permission",
    async (_method, handler, permission) => {
      mockHasPermission.mockReturnValue(false);

      const response = await handler(
        request,
        sharedUser,
        {},
        TenantMode.SHARED,
        context,
      );

      expect(response.status).toBe(403);
      expect(mockHasPermission).toHaveBeenCalledWith(
        sharedUser,
        ProjectSlug.PROFILES,
        permission,
      );
    },
  );

  it.each([
    ["PATCH", PATCH as unknown as RawProfileHandler],
    ["DELETE", DELETE as unknown as RawProfileHandler],
  ])(
    "rejects %s in shared mode when the user has no factory assignment",
    async (_method, handler) => {
      mockHasPermission.mockReturnValue(true);

      const response = await handler(
        request,
        { ...sharedUser, factory_id: null },
        {},
        TenantMode.SHARED,
        context,
      );

      expect(response.status).toBe(403);
    },
  );
})
