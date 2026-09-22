import { describe, expect, it } from "vitest";
import { EntryStatus, EntrySource } from "@/lib/constants/enums";
import { addDeviceEntrySchema, addEntrySchema, editEntrySchema } from "./entries";

const validEntry = {
  vehicle_number: "PB10XY1234",
  weight: "15.5",
  center_id: "1",
  user_id: "2",
};

describe("entries validation", () => {
  it("parses valid raw entry data and sets default pending status", () => {
    const result = addEntrySchema.parse(validEntry);

    expect(result.status).toBe(EntryStatus.PENDING);
    expect(result.customer_id).toBeNull();
  });

  it("parses valid manual entry with omitted user_id", () => {
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

  it("parses valid device entry data with images default to empty array", () => {
    const result = addDeviceEntrySchema.parse({
      detected_vehicle_number: "MH12AB1234",
      weight: "18000",
      center_id: "3",
    });

    expect(result.detected_vehicle_number).toBe("MH12AB1234");
    expect(result.weight).toBe(18000);
    expect(result.center_id).toBe(3);
    expect(result.images).toEqual([]);
    expect(result).not.toHaveProperty("status");
  });

  it("parses valid device entry data with provided images", () => {
    const result = addDeviceEntrySchema.parse({
      detected_vehicle_number: "MH12AB1234",
      weight: 18000,
      center_id: 3,
      images: ["base64image"],
    });

    expect(result.images).toEqual(["base64image"]);
    expect(result).not.toHaveProperty("status");
  });

  it("allows NO_PLATE_DETECTED in device entry schema", () => {
    const withNoPlate = addDeviceEntrySchema.parse({
      detected_vehicle_number: "NO_PLATE_DETECTED",
      weight: "18000",
      center_id: "3",
    });
    expect(withNoPlate.detected_vehicle_number).toBe("NO_PLATE_DETECTED");
  });

  it("normalizes variations of no plate detected to canonical NO_PLATE_DETECTED", () => {
    for (const variant of [
      "no plate detected",
      "No Plate Detected",
      "NO PLATE DETECTED",
      "no_plate_detected",
      "no-plate-detected",
    ]) {
      const parsed = addDeviceEntrySchema.parse({
        detected_vehicle_number: variant,
        weight: "18000",
        center_id: "3",
      });
      expect(parsed.detected_vehicle_number).toBe("NO_PLATE_DETECTED");
    }
  });

  it("rejects omitting center_id in device entry schema", () => {
    expect(() =>
      addDeviceEntrySchema.parse({
        detected_vehicle_number: "MH12AB1234",
        weight: 18000,
      }),
    ).toThrow();
  });

  it("rejects device entry when detected_vehicle_number is missing", () => {
    expect(() =>
      addDeviceEntrySchema.parse({
        weight: 18000,
        center_id: 3,
      }),
    ).toThrow();
  });

  it("validates Indian license plate formats correctly including Bharat series", () => {
    // Valid standard state
    expect(
      addEntrySchema.parse({
        vehicle_number: "DL1CAB1234",
        weight: 1000,
        center_id: 1,
      }).vehicle_number,
    ).toBe("DL1CAB1234");

    // Valid BH series
    expect(
      addEntrySchema.parse({
        vehicle_number: "22BH1234AA",
        weight: 1000,
        center_id: 1,
      }).vehicle_number,
    ).toBe("22BH1234AA");

    // Invalid state code
    expect(() =>
      addEntrySchema.parse({
        vehicle_number: "ZZ12AB1234",
        weight: 1000,
        center_id: 1,
      }),
    ).toThrow();

    // Invalid plate format
    expect(() =>
      addEntrySchema.parse({
        vehicle_number: "INVALID-PLATE",
        weight: 1000,
        center_id: 1,
      }),
    ).toThrow();
  });

  it("allows partial edits for entry customer, weight, and vehicle_number", () => {
    expect(editEntrySchema.parse({ customer_id: "5" })).toEqual({
      customer_id: 5,
    });

    expect(
      editEntrySchema.parse({
        vehicle_number: "GJ01AB1234",
        weight: "12000",
      }),
    ).toEqual({
      vehicle_number: "GJ01AB1234",
      weight: 12000,
    });

    expect(() =>
      editEntrySchema.parse({
        vehicle_number: "INVALID",
      }),
    ).toThrow();
  });
});
