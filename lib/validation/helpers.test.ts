import { describe, expect, it } from "vitest";
import {
  integerIdSchema,
  optionalIntegerIdSchema,
  uuidSchema,
  nameSchema,
  requiredStringSchema,
  STATE_CODES,
  validateIndianPlateStateCode,
  indianPlateSchema,
  optionalIndianPlateSchema,
  positiveWeightSchema,
  optionalPositiveWeightSchema,
  isNoPlateDetectedText,
  isValidIndianPlate,
} from "./helpers";

describe("validation helpers", () => {
  describe("integerIdSchema & optionalIntegerIdSchema", () => {
    const idSchema = integerIdSchema("Center ID");
    const optIdSchema = optionalIntegerIdSchema("Customer ID");

    it("preprocesses string integers into numbers", () => {
      expect(idSchema.parse("42")).toBe(42);
      expect(idSchema.parse(42)).toBe(42);
    });

    it("rejects non-positive numbers and non-integers", () => {
      expect(() => idSchema.parse("0")).toThrow();
      expect(() => idSchema.parse("-5")).toThrow();
      expect(() => idSchema.parse("3.14")).toThrow();
      expect(() => idSchema.parse("not-a-number")).toThrow();
    });

    it("handles optional and nullable values in optionalIntegerIdSchema", () => {
      expect(optIdSchema.parse(undefined)).toBeUndefined();
      expect(optIdSchema.parse(null)).toBeNull();
      expect(optIdSchema.parse("")).toBeNull();
      expect(optIdSchema.parse("15")).toBe(15);
    });
  });

  describe("uuidSchema, nameSchema, requiredStringSchema", () => {
    it("validates UUID strings", () => {
      const schema = uuidSchema("Record UUID");
      expect(schema.parse("123e4567-e89b-12d3-a456-426614174000")).toBe(
        "123e4567-e89b-12d3-a456-426614174000",
      );
      expect(() => schema.parse("invalid-uuid")).toThrow();
    });

    it("validates name min and max lengths", () => {
      const schema = nameSchema("Item Name", 2, 10);
      expect(schema.parse("Abc")).toBe("Abc");
      expect(() => schema.parse("A")).toThrow();
      expect(() => schema.parse("This is way too long")).toThrow();
    });

    it("validates required non-empty string", () => {
      const schema = requiredStringSchema("Title");
      expect(schema.parse("Valid Title")).toBe("Valid Title");
      expect(() => schema.parse("")).toThrow();
    });
  });

  describe("Indian Plate Validation", () => {
    const plate = indianPlateSchema("Vehicle Number");
    const optPlate = optionalIndianPlateSchema("Vehicle Number");

    it("validates all Indian state and UT codes including TG (Telangana)", () => {
      expect(STATE_CODES).toContain("TG");
      expect(STATE_CODES).toContain("TS");
      for (const code of STATE_CODES) {
        const testPlate = `${code}01AB1234`;
        expect(validateIndianPlateStateCode(testPlate)).toBe(true);
        expect(plate.parse(testPlate)).toBe(testPlate);
      }
    });

    it("validates Bharat series (BH)", () => {
      expect(validateIndianPlateStateCode("22BH1234AA")).toBe(true);
      expect(plate.parse("22BH1234AA")).toBe("22BH1234AA");
      expect(plate.parse("21BH9999Z")).toBe("21BH9999Z");
    });

    it("validates Vintage series (VA)", () => {
      expect(validateIndianPlateStateCode("DLVAAB0001")).toBe(true);
      expect(plate.parse("DLVAAB0001")).toBe("DLVAAB0001");
      expect(plate.parse("MH-VA-AB-1234")).toBe("MHVAAB1234");
    });

    it("validates 1-digit and 2-digit vehicle registration numbers", () => {
      expect(plate.parse("MH12AB1")).toBe("MH12AB1");
      expect(plate.parse("MH-12-AB-12")).toBe("MH12AB12");
      expect(plate.parse("DL-1-C-AB-7")).toBe("DL1CAB7");
      expect(plate.parse("KA01E45")).toBe("KA01E45");
    });

    it("validates early RTO series without letters", () => {
      expect(plate.parse("MH121234")).toBe("MH121234");
      expect(plate.parse("DL-01-1234")).toBe("DL011234");
      expect(plate.parse("GA015678")).toBe("GA015678");
    });

    it("rejects invalid state codes", () => {
      expect(validateIndianPlateStateCode("ZZ01AB1234")).toBe(false);
      expect(() => plate.parse("ZZ01AB1234")).toThrow();
    });

    it("rejects incomplete or invalid plate formats", () => {
      expect(() => plate.parse("MH12")).toThrow();
      expect(() => plate.parse("MH12AB12345")).toThrow();
      expect(() => plate.parse("1234")).toThrow();
      expect(() => plate.parse("INVALID")).toThrow();
    });

    it("handles optionalIndianPlateSchema with undefined", () => {
      expect(optPlate.parse(undefined)).toBeUndefined();
      expect(optPlate.parse("MH12AB1234")).toBe("MH12AB1234");
    });

    it("normalizes separators (dashes, spaces, dots) and trims surrounding whitespace", () => {
      expect(plate.parse("MH-04-AB-1212")).toBe("MH04AB1212");
      expect(plate.parse("mh-04-ab-1212")).toBe("MH04AB1212");
      expect(plate.parse("MH 04 AB 1212")).toBe("MH04AB1212");
      expect(plate.parse("  MH.04.AB.1212  ")).toBe("MH04AB1212");
      expect(plate.parse("DL-1-C-AB-1234")).toBe("DL1CAB1234");
      expect(optPlate.parse("KA-01-AB-1234")).toBe("KA01AB1234");
    });
  });

  describe("positiveWeightSchema & optionalPositiveWeightSchema", () => {
    const weight = positiveWeightSchema("Weight");
    const optWeight = optionalPositiveWeightSchema("Weight");

    it("coerces string numbers and enforces positive value", () => {
      expect(weight.parse("15000")).toBe(15000);
      expect(weight.parse("0.5")).toBe(0.5);
      expect(() => weight.parse("0")).toThrow();
      expect(() => weight.parse("-10")).toThrow();
    });

    it("handles optional weight", () => {
      expect(optWeight.parse(undefined)).toBeUndefined();
      expect(optWeight.parse("2500")).toBe(2500);
    });
  });

  describe("isNoPlateDetectedText", () => {
    it("recognizes exact NO_PLATE_DETECTED", () => {
      expect(isNoPlateDetectedText("NO_PLATE_DETECTED")).toBe(true);
    });

    it("recognizes variations with spaces, hyphens, underscores and lowercase", () => {
      expect(isNoPlateDetectedText("no plate detected")).toBe(true);
      expect(isNoPlateDetectedText("NO PLATE DETECTED")).toBe(true);
      expect(isNoPlateDetectedText("No Plate Detected")).toBe(true);
      expect(isNoPlateDetectedText("no_plate_detected")).toBe(true);
      expect(isNoPlateDetectedText("no-plate-detected")).toBe(true);
      expect(isNoPlateDetectedText("  no  plate  detected  ")).toBe(true);
      expect(isNoPlateDetectedText("NOPLATEDETECTED")).toBe(true);
    });

    it("returns false for valid plates or non-matching strings", () => {
      expect(isNoPlateDetectedText("MH12AB1234")).toBe(false);
      expect(isNoPlateDetectedText("plate detected")).toBe(false);
      expect(isNoPlateDetectedText("")).toBe(false);
      expect(isNoPlateDetectedText(null)).toBe(false);
      expect(isNoPlateDetectedText(undefined)).toBe(false);
      expect(isNoPlateDetectedText(123)).toBe(false);
    });
  });

  describe("isValidIndianPlate", () => {
    it("returns true for valid standard, BH, and VA series plates", () => {
      expect(isValidIndianPlate("MH12AB1234")).toBe(true);
      expect(isValidIndianPlate("mh-12-ab-1234")).toBe(true);
      expect(isValidIndianPlate("DL 1 C AB 1234")).toBe(true);
      expect(isValidIndianPlate("22BH1234AA")).toBe(true);
      expect(isValidIndianPlate("DLVAAB0001")).toBe(true);
    });

    it("returns false for no plate detected strings", () => {
      expect(isValidIndianPlate("NO_PLATE_DETECTED")).toBe(false);
      expect(isValidIndianPlate("no plate detected")).toBe(false);
      expect(isValidIndianPlate("no_plate_detected")).toBe(false);
    });

    it("returns false for invalid state codes or malformed plates", () => {
      expect(isValidIndianPlate("ZZ01AB1234")).toBe(false);
      expect(isValidIndianPlate("INVALID")).toBe(false);
      expect(isValidIndianPlate("")).toBe(false);
      expect(isValidIndianPlate(null)).toBe(false);
      expect(isValidIndianPlate(undefined)).toBe(false);
    });
  });
});
