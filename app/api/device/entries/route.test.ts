import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { EntryStatus, EntryType, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

const { mockGetAuthUser, mockCreateEntry } = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockCreateEntry: vi.fn(),
}));

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    getAuthUser: mockGetAuthUser,
  };
});

vi.mock("@/lib/services/entries", () => ({
  createEntry: mockCreateEntry,
}));

import { POST } from "./route";

describe("Device Entries Route (POST /api/device/entries)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      user: {
        sub: "5",
        username: "hardware_01",
        name: "Hardware Unit",
        role: Role.HARDWARE,
        factory_id: 1,
      },
    });
  });

  it("returns 401 when device auth user is not found", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/device/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe(ApiErrorMessage.FORBIDDEN);
  });

  it("returns 403 when user role is not authorized for hardware entry ingestion", async () => {
    mockGetAuthUser.mockResolvedValue({
      user: {
        sub: "5",
        username: "baseuser",
        name: "Base User",
        role: Role.BASE,
        factory_id: 1,
      },
    });

    const req = new NextRequest("http://localhost/api/device/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe(ApiErrorMessage.FORBIDDEN);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = new NextRequest("http://localhost/api/device/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_number: "MH12AB1234",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("successfully creates automatic entry with default PENDING status", async () => {
    const createdEntry = {
      id: 50,
      detected_vehicle_number: "MH12AB1234",
      vehicle_number: "MH12AB1234",
      weight: 15000,
      center_id: 2,
      user_id: 5,
      factory_id: 1,
      type: EntryType.AUTOMATIC,
      status: EntryStatus.PENDING,
    };
    mockCreateEntry.mockResolvedValue(createdEntry);

    const req = new NextRequest("http://localhost/api/device/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        detected_vehicle_number: "MH12AB1234",
        vehicle_number: "MH12AB1234",
        weight: 15000,
        center_id: 2,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toEqual(createdEntry);
    expect(mockCreateEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        factoryId: 1,
        userId: 5,
        type: EntryType.AUTOMATIC,
        detectedVehicleNumber: "MH12AB1234",
        vehicleNumber: "MH12AB1234",
        weight: 15000,
        centerId: 2,
        status: EntryStatus.PENDING,
      }),
    );
  });

  it("successfully creates automatic entry with explicit APPROVED status", async () => {
    const createdEntry = {
      id: 51,
      detected_vehicle_number: "MH12AB1234",
      vehicle_number: "MH12AB1234",
      weight: 15000,
      center_id: 2,
      user_id: 5,
      factory_id: 1,
      type: EntryType.AUTOMATIC,
      status: EntryStatus.APPROVED,
    };
    mockCreateEntry.mockResolvedValue(createdEntry);

    const req = new NextRequest("http://localhost/api/device/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        detected_vehicle_number: "MH12AB1234",
        vehicle_number: "MH12AB1234",
        weight: 15000,
        center_id: 2,
        status: EntryStatus.APPROVED,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toEqual(createdEntry);
    expect(mockCreateEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: EntryStatus.APPROVED,
      }),
    );
  });

  it("returns 400 when createEntry throws an error", async () => {
    mockCreateEntry.mockRejectedValue(new Error(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND));

    const req = new NextRequest("http://localhost/api/device/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        detected_vehicle_number: "MH12AB1234",
        vehicle_number: "MH12AB1234",
        weight: 15000,
        center_id: 99,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND);
  });
});
