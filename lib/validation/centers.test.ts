import { describe, expect, it } from "vitest";
import { addCenterSchema, editCenterSchema } from "./centers";

describe("centers validation", () => {
  describe("addCenterSchema", () => {
    it("parses valid center with default auto_approve false", () => {
      const result = addCenterSchema.parse({ name: "Center North" });
      expect(result.name).toBe("Center North");
      expect(result.auto_approve).toBe(false);
    });

    it("parses valid center with explicit auto_approve true", () => {
      const result = addCenterSchema.parse({ name: "Center South", auto_approve: true });
      expect(result.name).toBe("Center South");
      expect(result.auto_approve).toBe(true);
    });

    it("rejects empty center name", () => {
      expect(() => addCenterSchema.parse({ name: "" })).toThrow();
    });

    it("rejects missing center name", () => {
      expect(() => addCenterSchema.parse({})).toThrow();
    });
  });

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
