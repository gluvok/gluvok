import { describe, expect, it } from "vitest"
import { EntityKey, Unit, WeighmentType } from "@/lib/constants/enums"
import { addWeighmentSchema, editWeighmentSchema } from "./weighments"

const validWeighment = {
  [EntityKey.VEHICLE_NUMBER]: "PB10XY1234",
  [EntityKey.WEIGHT]: "15.5",
  [EntityKey.UNIT]: Unit.KG,
  [EntityKey.TYPE]: WeighmentType.IN,
  [EntityKey.CENTER_ID]: "1",
  [EntityKey.PROFILE_ID]: "2",
}

describe("weighment validation", () => {
  it("accepts blank Rate and Customer values as null", () => {
    const result = addWeighmentSchema.parse(validWeighment)

    expect(result[EntityKey.RATE_ID]).toBeNull()
    expect(result[EntityKey.CUSTOMER_ID]).toBeNull()
  })

  it("allows partial edits without create-only requirements", () => {
    expect(editWeighmentSchema.parse({ [EntityKey.IS_ACTIVE]: false })).toEqual({
      [EntityKey.IS_ACTIVE]: false,
    })
  })
})