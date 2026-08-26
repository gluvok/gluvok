import { describe, expect, it } from "vitest";
import { EntityKey, Unit, EntryStatus, EntryType } from "@/lib/constants/enums";
import { addEntrySchema, editEntrySchema, editWeighmentSchema } from "./weighments";

const validEntry = {
  [EntityKey.DETECTED_VEHICLE_NUMBER]: "PB10XY1234",
  [EntityKey.VEHICLE_NUMBER]: "PB10XY1234",
  [EntityKey.WEIGHT]: "15.5",
  [EntityKey.CENTER_ID]: "1",
  [EntityKey.PROFILE_ID]: "2",
};

describe("entries & weighments validation", () => {
  it("parses valid raw entry data and sets default pending status", () => {
    const result = addEntrySchema.parse(validEntry);

    expect(result[EntityKey.STATUS]).toBe(EntryStatus.PENDING);
    expect(result[EntityKey.CUSTOMER_ID]).toBeNull();
  });

  it("parses valid manual entry with omitted detected_vehicle_number and profile_id", () => {
    const result = addEntrySchema.parse({
      [EntityKey.VEHICLE_NUMBER]: "MH12AB1234",
      [EntityKey.WEIGHT]: "15000",
      [EntityKey.CENTER_ID]: "1",
      [EntityKey.TYPE]: EntryType.MANUAL,
    });

    expect(result[EntityKey.VEHICLE_NUMBER]).toBe("MH12AB1234");
    expect(result[EntityKey.WEIGHT]).toBe(15000);
    expect(result[EntityKey.CENTER_ID]).toBe(1);
    expect(result[EntityKey.TYPE]).toBe(EntryType.MANUAL);
    expect(result[EntityKey.STATUS]).toBe(EntryStatus.PENDING);
  });

  it("allows partial edits for entry customer", () => {
    expect(editEntrySchema.parse({ [EntityKey.CUSTOMER_ID]: "5" })).toEqual({
      [EntityKey.CUSTOMER_ID]: 5,
    });
  });

  it("allows updating unit on weighment edit schema", () => {
    expect(editWeighmentSchema.parse({ [EntityKey.UNIT]: Unit.Q })).toEqual({
      [EntityKey.UNIT]: Unit.Q,
    });
  });
});
