import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntryStatus, EntrySource, PermissionKey, ProjectSlug } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import {
  createMockQueryBuilder,
  createMockSupabase,
  createMockUser,
  createMockEntry,
  createMockJsonRequest,
} from "@/tests/test-utils";

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
  user: ReturnType<typeof createMockUser>,
  db: unknown,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

const sampleUser = createMockUser();
const context = { params: Promise.resolve({ id: "10" }) };

describe("Entries [id] route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("rejects PATCH when entry status is REJECTED", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      status: EntryStatus.APPROVED,
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({
        maybeSingleData: createMockEntry({
          id: 10,
          status: EntryStatus.REJECTED,
          vehicle_number: "MH12AB1234",
        }),
      }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.ENTRY_REJECTED_LOCKED);
  });

  it("allows updating vehicle_number on auto_approved entry when unedited", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      vehicle_number: "KA01AB9999",
    });

    const existingEntry = createMockEntry({
      id: 10,
      status: EntryStatus.APPROVED,
      auto_approved: true,
      detected_vehicle_number: "KA01AB1111",
      vehicle_number: "KA01AB1111",
    });

    let fetchCount = 0;
    const entriesQuery = createMockQueryBuilder({
      maybeSingleData: existingEntry,
      singleData: { ...existingEntry, vehicle_number: "KA01AB9999" },
    });
    entriesQuery.maybeSingle.mockImplementation(async () => {
      fetchCount++;
      return { data: fetchCount === 1 ? existingEntry : null, error: null };
    });

    const mockDb = createMockSupabase({
      entries: entriesQuery,
      weighments: createMockQueryBuilder({ maybeSingleData: null }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.vehicle_number).toBe("KA01AB9999");
    expect(json.data.edited).toBe(true);
  });

  it("rejects updating vehicle_number on auto_approved entry when vehicle is already edited", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      vehicle_number: "KA01AB8888",
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({
        maybeSingleData: createMockEntry({
          id: 10,
          status: EntryStatus.APPROVED,
          auto_approved: true,
          detected_vehicle_number: "KA01AB1111",
          vehicle_number: "KA01AB9999",
        }),
      }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.VEHICLE_ALREADY_EDITED_LOCKED);
  });

  it("rejects updating vehicle_number on manually approved entry", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      vehicle_number: "KA01AB8888",
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({
        maybeSingleData: createMockEntry({
          id: 10,
          status: EntryStatus.APPROVED,
          auto_approved: false,
          detected_vehicle_number: null,
          vehicle_number: "KA01AB1111",
        }),
      }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.CANNOT_MODIFY_MANUALLY_APPROVED_VEHICLE);
  });

  it("rejects PATCH when entry is fully locked (approved with customer and edited/manual)", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      vehicle_number: "KA01AB8888",
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({
        maybeSingleData: createMockEntry({
          id: 10,
          status: EntryStatus.APPROVED,
          auto_approved: false,
          detected_vehicle_number: null,
          vehicle_number: "KA01AB1111",
          customer_id: 5,
        }),
      }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.ENTRY_FULLY_LOCKED);
  });

  it("blocks DELETE when entry is linked to an active weighment", async () => {
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const mockDb = createMockSupabase({
      weighments: createMockQueryBuilder({
        data: [{ id: 50 }],
      }),
    });

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.CANNOT_DELETE_ENTRY(10));
  });

  it("allows DELETE when entry is not linked to any active weighment", async () => {
    const deleteRequest = new Request("http://localhost/api/entries/10", { method: "DELETE" });

    const mockDb = createMockSupabase({
      weighments: createMockQueryBuilder({ data: [] }),
      entries: createMockQueryBuilder({ data: [{ id: 10 }] }),
    });

    const handler = DELETE as unknown as RawHandler;
    const response = await handler(deleteRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true, id: 10 });
  });

  it("allows updating vehicle_number on automatic pending entry without setting edited to true", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      vehicle_number: "KA01AB7777",
    });

    const existingEntry = createMockEntry({
      id: 10,
      status: EntryStatus.PENDING,
      source: EntrySource.DEVICE,
      auto_approved: false,
      detected_vehicle_number: "KA01AB1111",
      vehicle_number: "KA01AB1111",
    });

    let fetchCount = 0;
    const entriesQuery = createMockQueryBuilder({
      maybeSingleData: existingEntry,
      singleData: { ...existingEntry, vehicle_number: "KA01AB7777" },
    });
    entriesQuery.maybeSingle.mockImplementation(async () => {
      fetchCount++;
      return { data: fetchCount === 1 ? existingEntry : null, error: null };
    });

    const mockDb = createMockSupabase({
      entries: entriesQuery,
      weighments: createMockQueryBuilder({ maybeSingleData: null }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.vehicle_number).toBe("KA01AB7777");
    expect(json.data.edited).toBe(false);
  });

  it("rejects updating weight on device pending entry", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      weight: 25000,
    });

    const existingEntry = createMockEntry({
      id: 10,
      status: EntryStatus.PENDING,
      source: EntrySource.DEVICE,
      auto_approved: false,
      weight: 20000,
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({ maybeSingleData: existingEntry }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Cannot modify weight on a device entry.");
  });

  it("allows updating customer_id on manually approved entry when customer_id is null", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      customer_id: 3,
    });

    const existingEntry = createMockEntry({
      id: 10,
      status: EntryStatus.APPROVED,
      source: EntrySource.MANUAL,
      auto_approved: false,
      detected_vehicle_number: null,
      customer_id: null,
    });

    let fetchCount = 0;
    const entriesQuery = createMockQueryBuilder({
      maybeSingleData: existingEntry,
      singleData: { ...existingEntry, customer_id: 3 },
    });
    entriesQuery.maybeSingle.mockImplementation(async () => {
      fetchCount++;
      return { data: fetchCount === 1 ? existingEntry : null, error: null };
    });

    const mockDb = createMockSupabase({
      customers: createMockQueryBuilder({ maybeSingleData: { id: 3 } }),
      entries: entriesQuery,
      weighments: createMockQueryBuilder({ maybeSingleData: null }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.customer_id).toBe(3);
    expect(json.data.edited).toBe(false);
  });

  it("rejects approving an entry when vehicle_number is NO_PLATE_DETECTED", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      status: EntryStatus.APPROVED,
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({
        maybeSingleData: createMockEntry({
          id: 10,
          status: EntryStatus.PENDING,
          vehicle_number: "NO_PLATE_DETECTED",
          detected_vehicle_number: "NO_PLATE_DETECTED",
          auto_approved: false,
        }),
      }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.CANNOT_APPROVE_NO_PLATE);
  });

  it("rejects approving an entry when vehicle_number is lowercase/spaced no plate detected", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      status: EntryStatus.APPROVED,
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({
        maybeSingleData: createMockEntry({
          id: 10,
          status: EntryStatus.PENDING,
          vehicle_number: "no plate detected",
          detected_vehicle_number: "no plate detected",
          auto_approved: false,
        }),
      }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ApiErrorMessage.CANNOT_APPROVE_NO_PLATE);
  });

  it("rejects approving an entry when vehicle_number does not match Indian plate regex", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      status: EntryStatus.APPROVED,
    });

    const mockDb = createMockSupabase({
      entries: createMockQueryBuilder({
        maybeSingleData: createMockEntry({
          id: 10,
          status: EntryStatus.PENDING,
          vehicle_number: "INVALID123",
          detected_vehicle_number: null,
          auto_approved: false,
        }),
      }),
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
    expect(json.error).not.toBe(ApiErrorMessage.CANNOT_APPROVE_NO_PLATE);
  });

  it("disbands linked weighment by deleting it and re-merges when auto-approved entry plate changes", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      vehicle_number: "MH04AB1212",
    });

    const weighmentDeleteMock = vi.fn();
    let entryFetchCount = 0;

    const entriesQuery = createMockQueryBuilder();
    entriesQuery.maybeSingle.mockImplementation(async () => {
      entryFetchCount++;
      if (entryFetchCount === 1) {
        return {
          data: createMockEntry({
            id: 10,
            status: EntryStatus.APPROVED,
            source: EntrySource.DEVICE,
            auto_approved: true,
            detected_vehicle_number: "MH12AB1234",
            vehicle_number: "MH12AB1234",
            created_at: "2026-08-31T10:00:00Z",
          }),
          error: null,
        };
      }
      if (entryFetchCount === 2) {
        return { data: null, error: null };
      }
      if (entryFetchCount === 3) {
        return { data: { id: 20, vehicle_number: "MH12AB1234" }, error: null };
      }
      return { data: null, error: null };
    });
    entriesQuery.single.mockResolvedValue({
      data: createMockEntry({
        id: 10,
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        auto_approved: true,
        detected_vehicle_number: "MH12AB1234",
        vehicle_number: "MH04AB1212",
        created_at: "2026-08-31T10:00:00Z",
      }),
      error: null,
    });

    const weighmentsQuery = createMockQueryBuilder({
      maybeSingleData: {
        id: 99,
        in_entry_id: 10,
        out_entry_id: 20,
      },
    });
    weighmentsQuery.eq.mockImplementation((col: string, val: unknown) => {
      if (col === "id") weighmentDeleteMock(val);
      return weighmentsQuery;
    });

    const mockDb = createMockSupabase({
      entries: entriesQuery,
      weighments: weighmentsQuery,
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.vehicle_number).toBe("MH04AB1212");
    expect(json.data.edited).toBe(true);
    expect(weighmentDeleteMock).toHaveBeenCalledWith(99);
  });

  it("updates both entries in trip and keeps weighment intact when update_weighment_pair is true", async () => {
    const patchRequest = createMockJsonRequest("http://localhost/api/entries/10", "PATCH", {
      vehicle_number: "MH04AB1212",
      update_weighment_pair: true,
    });

    const partnerEntryUpdateMock = vi.fn();
    let entryFetchCount = 0;

    const entriesQuery = createMockQueryBuilder();
    entriesQuery.eq.mockImplementation((col: string, val: unknown) => {
      if (col === "id" && val === 20) {
        partnerEntryUpdateMock();
      }
      return entriesQuery;
    });
    entriesQuery.maybeSingle.mockImplementation(async () => {
      entryFetchCount++;
      if (entryFetchCount === 1) {
        return {
          data: createMockEntry({
            id: 10,
            status: EntryStatus.APPROVED,
            source: EntrySource.DEVICE,
            auto_approved: true,
            detected_vehicle_number: "MH12AB1234",
            vehicle_number: "MH12AB1234",
            created_at: "2026-08-31T10:00:00Z",
          }),
          error: null,
        };
      }
      return { data: null, error: null };
    });
    entriesQuery.single.mockResolvedValue({
      data: createMockEntry({
        id: 10,
        status: EntryStatus.APPROVED,
        source: EntrySource.DEVICE,
        auto_approved: true,
        detected_vehicle_number: "MH12AB1234",
        vehicle_number: "MH04AB1212",
        created_at: "2026-08-31T10:00:00Z",
      }),
      error: null,
    });

    const weighmentsQuery = createMockQueryBuilder({
      maybeSingleData: {
        id: 99,
        in_entry_id: 10,
        out_entry_id: 20,
      },
    });

    const mockDb = createMockSupabase({
      entries: entriesQuery,
      weighments: weighmentsQuery,
    });

    const handler = PATCH as unknown as RawHandler;
    const response = await handler(patchRequest, sampleUser, mockDb, context);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.vehicle_number).toBe("MH04AB1212");
    expect(partnerEntryUpdateMock).toHaveBeenCalled();
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
