import { describe, expect, it, vi, beforeEach } from "vitest";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";

const { mockHasPermission } = vi.hoisted(() => ({ mockHasPermission: vi.fn() }));

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
    withEntityScope: <T>(handler: T) => handler,
    hasPermission: mockHasPermission,
  };
});

import { PATCH } from "./route";

type RawPatchHandler = (
  request: Request,
  user: { sub: string; role: Role; factory_id: number },
  db: unknown,
  context: { params: Promise<{ id: string }> },
  scope: { entityId: number; factoryId: number },
) => Promise<Response>;

const adminUser = { sub: "1", role: Role.ADMIN, factory_id: 1 };
const managerUser = { sub: "2", role: Role.MANAGER, factory_id: 1 };
const context = { params: Promise.resolve({ id: "1" }) };
const scope = { entityId: 1, factoryId: 1 };

describe("PATCH /api/settings/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("rejects when user lacks WRITE permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const patchReq = new Request("http://localhost/api/settings/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Factory" }),
    });
    const response = await (PATCH as unknown as RawPatchHandler)(
      patchReq,
      adminUser,
      {},
      context,
      scope,
    );
    expect(response.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith(
      adminUser,
      ProjectSlug.SETTINGS,
      PermissionKey.WRITE,
    );
  });

  it("returns 404 when target entityId does not match factoryId", async () => {
    const wrongScope = { entityId: 99, factoryId: 1 };
    const patchReq = new Request("http://localhost/api/settings/99", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Factory" }),
    });
    const response = await (PATCH as unknown as RawPatchHandler)(
      patchReq,
      adminUser,
      {},
      context,
      wrongScope,
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 on invalid payload", async () => {
    const patchReq = new Request("http://localhost/api/settings/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "" }),
    });
    const response = await (PATCH as unknown as RawPatchHandler)(
      patchReq,
      adminUser,
      {},
      context,
      scope,
    );
    expect(response.status).toBe(400);
  });

  it("rejects Manager attempting to modify factory settings with 403 Forbidden", async () => {
    const patchReq = new Request("http://localhost/api/settings/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Manager Renamed Factory" }),
    });
    const response = await (PATCH as unknown as RawPatchHandler)(
      patchReq,
      managerUser,
      {},
      context,
      scope,
    );
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Only admin has permission to modify factory settings.");
  });

  it("rejects Manager attempting to modify check_center_on_merge with 403 Forbidden", async () => {
    const patchReq = new Request("http://localhost/api/settings/1", {
      method: "PATCH",
      body: JSON.stringify({ check_center_on_merge: true }),
    });
    const response = await (PATCH as unknown as RawPatchHandler)(
      patchReq,
      managerUser,
      {},
      context,
      scope,
    );
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Only admin has permission to modify factory settings.");
  });

  it("allows Admin to modify factory name and check_center_on_merge", async () => {
    const updated = {
      id: 1,
      name: "Acme Sugars",
      check_center_on_merge: true,
      updated_at: new Date().toISOString(),
    };
    const mockQuery: Record<string, unknown> = {};
    mockQuery.update = vi.fn(() => mockQuery);
    mockQuery.eq = vi.fn(() => mockQuery);
    mockQuery.is = vi.fn(() => mockQuery);
    mockQuery.select = vi.fn(() => mockQuery);
    mockQuery.maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null });

    const mockDb = { from: vi.fn(() => mockQuery) };

    const patchReq = new Request("http://localhost/api/settings/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Acme Sugars", check_center_on_merge: true }),
    });
    const response = await (PATCH as unknown as RawPatchHandler)(
      patchReq,
      adminUser,
      mockDb,
      context,
      scope,
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.name).toBe("Acme Sugars");
    expect(json.data.check_center_on_merge).toBe(true);
  });
});
