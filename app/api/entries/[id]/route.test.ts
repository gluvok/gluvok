import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntryStatus, PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

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

type RawHandler = (
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
  sub: "1",
  username: "operator",
  role: Role.OPERATOR,
  factory_id: 1,
};

const context = { params: Promise.resolve({ id: "10" }) };

describe("Entries [id] route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects PATCH when entry status is REJECTED", async () => {
    const patchRequest = new Request("http://localhost/api/entries/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: EntryStatus.APPROVED }),
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 10,
                    status: EntryStatus.REJECTED,
                    vehicle_number: "MH12AB1234",
                    factory_id: 1,
                  },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Rejected entries cannot be modified or approved.");
  });

  it("blocks DELETE when entry is linked to an active weighment", async () => {
    mockHasPermission.mockReturnValue(true);
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            is: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 50 },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.CANNOT_DELETE_ENTRY(10));
  });

  it("allows DELETE when entry is not linked to any active weighment", async () => {
    mockHasPermission.mockReturnValue(true);
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "weighments") {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                is: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [{ id: 10 }] }),
                })),
              })),
            })),
          })),
        };
      }),
    };

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true, id: 10 });
  });

  it("rejects DELETE when user lacks DELETE permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, {}, context);

    expect(response.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith(
      sampleUser,
      ProjectSlug.ENTRIES,
      PermissionKey.DELETE,
    );
  });
});
