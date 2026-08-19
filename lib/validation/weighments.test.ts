import { describe, expect, it } from "vitest"
import { EntityKey, Unit, EntryStatus } from "@/lib/constants/enums"
import { addEntrySchema, editEntrySchema, editWeighmentSchema } from "./weighments"

const validEntry = {
  [EntityKey.DETECTED_VEHICLE_NUMBER]: "PB10XY1234",
  [EntityKey.VEHICLE_NUMBER]: "PB10XY1234",
  [EntityKey.WEIGHT]: "15.5",
  [EntityKey.CENTER_ID]: "1",
  [EntityKey.PROFILE_ID]: "2",
}

describe("entries & weighments validation", () => {
  it("parses valid raw entry data and sets default pending status", () => {
    const result = addEntrySchema.parse(validEntry)

    expect(result[EntityKey.STATUS]).toBe(EntryStatus.PENDING)
    expect(result[EntityKey.CUSTOMER_ID]).toBeNull()
  })

  it("allows partial edits for entry customer", () => {
    expect(editEntrySchema.parse({ [EntityKey.CUSTOMER_ID]: "5" })).toEqual({
      [EntityKey.CUSTOMER_ID]: 5,
    })
  })

  it("allows updating unit on weighment edit schema", () => {
    expect(editWeighmentSchema.parse({ [EntityKey.UNIT]: Unit.Q })).toEqual({
      [EntityKey.UNIT]: Unit.Q,
    })
  })
})