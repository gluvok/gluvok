import { describe, expect, it } from "vitest";
import { WeighmentType } from "@/lib/constants/enums";
import { editWeighmentSchema } from "./weighments";

describe("weighments validation", () => {
  it("allows updating type on weighment edit schema", () => {
    expect(editWeighmentSchema.parse({ type: WeighmentType.IN })).toEqual({
      type: WeighmentType.IN,
    });
  });

  it("allows updating rate_id on weighment edit schema", () => {
    expect(editWeighmentSchema.parse({ rate_id: "5" })).toEqual({
      rate_id: 5,
    });
  });

  it("allows clearing rate_id with null", () => {
    expect(editWeighmentSchema.parse({ rate_id: null })).toEqual({
      rate_id: null,
    });
  });

  it("allows empty payload for partial edits", () => {
    expect(editWeighmentSchema.parse({})).toEqual({});
  });
});
