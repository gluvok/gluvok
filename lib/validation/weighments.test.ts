import { describe, expect, it } from "vitest";
import { EntryStatus, EntrySource, WeighmentType } from "@/lib/constants/enums";
import {
  addDeviceEntrySchema,
  addEntrySchema,
  editEntrySchema,
  editWeighmentSchema,
} from "./weighments";

const validEntry = {
  detected_vehicle_number: "PB10XY1234",
  vehicle_number: "PB10XY1234",
  weight: "15.5",
  center_id: "1",
  user_id: "2",
};

describe("entries & weighments validation", () => {
  it("parses valid raw entry data and sets default pending status", () => {
    const result = addEntrySchema.parse(validEntry);

    expect(result.status).toBe(EntryStatus.PENDING);
    expect(result.customer_id).toBeNull();
  });

  it("parses valid manual entry with omitted detected_vehicle_number and user_id", () => {
    const result = addEntrySchema.parse({
      vehicle_number: "MH12AB1234",
      weight: "15000",
      center_id: "1",
      source: EntrySource.MANUAL,
    });

    expect(result.vehicle_number).toBe("MH12AB1234");
    expect(result.weight).toBe(15000);
    expect(result.center_id).toBe(1);
    expect(result.source).toBe(EntrySource.MANUAL);
    expect(result.status).toBe(EntryStatus.PENDING);
  });

  it("parses valid device entry data with default pending status", () => {
    const result = addDeviceEntrySchema.parse({
      detected_vehicle_number: "MH12AB1234",
      vehicle_number: "MH12AB1234",
      weight: "18000",
      center_id: "3",
    });

    expect(result.detected_vehicle_number).toBe("MH12AB1234");
    expect(result.vehicle_number).toBe("MH12AB1234");
    expect(result.weight).toBe(18000);
    expect(result.center_id).toBe(3);
    expect(result.status).toBe(EntryStatus.PENDING);
    expect(result.images).toEqual([]);
  });

  it("parses valid device entry data with explicit approved status", () => {
    const result = addDeviceEntrySchema.parse({
      detected_vehicle_number: "MH12AB1234",
      vehicle_number: "MH12AB1234",
      weight: 18000,
      center_id: 3,
      status: EntryStatus.APPROVED,
      images: ["base64image"],
    });

    expect(result.status).toBe(EntryStatus.APPROVED);
    expect(result.images).toEqual(["base64image"]);
  });

  it("rejects device entry when detected_vehicle_number is missing", () => {
    expect(() =>
      addDeviceEntrySchema.parse({
        vehicle_number: "MH12AB1234",
        weight: 18000,
        center_id: 3,
      }),
    ).toThrow();
  });

  it("allows partial edits for entry customer", () => {
    expect(editEntrySchema.parse({ customer_id: "5" })).toEqual({
      customer_id: 5,
    });
  });

  it("allows updating type on weighment edit schema", () => {
    expect(editWeighmentSchema.parse({ type: WeighmentType.IN })).toEqual({
      type: WeighmentType.IN,
    });
  });
});
