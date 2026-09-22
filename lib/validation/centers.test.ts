import { describe, expect, it } from "vitest";
import { editCenterSchema } from "./centers";

describe("centers validation", () => {
  describe("editCenterSchema", () => {
    it("allows updating name only", () => {
      const result = editCenterSchema.parse({ name: "Renamed Center" });
      expect(result.name).toBe("Renamed Center");
      expect(result.auto_approve).toBeUndefined();
    });

    it("allows updating auto_approve only", () => {
      const result = editCenterSchema.parse({ auto_approve: true });
      expect(result.name).toBeUndefined();
      expect(result.auto_approve).toBe(true);
    });

    it("allows empty payload for partial edits", () => {
      const result = editCenterSchema.parse({});
      expect(result).toEqual({});
    });

    it("rejects empty string name when provided", () => {
      expect(() => editCenterSchema.parse({ name: "" })).toThrow();
    });
  });
});
