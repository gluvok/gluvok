import { describe, expect, it } from "vitest";
import { Unit } from "@/lib/constants/enums";
import { addRateSchema, editRateSchema } from "./rates";

describe("rates validation", () => {
  describe("addRateSchema", () => {
    it("parses valid rate with string inputs preprocessed", () => {
      const result = addRateSchema.parse({
        commodity_id: "2",
        unit_price: "4500.5",
        unit: Unit.KG,
      });

      expect(result.commodity_id).toBe(2);
      expect(result.unit_price).toBe(4500.5);
      expect(result.unit).toBe(Unit.KG);
    });

    it("parses valid rate with quintal and gallon units", () => {
      expect(
        addRateSchema.parse({
          commodity_id: 1,
          unit_price: 3200,
          unit: Unit.Q,
        }).unit,
      ).toBe(Unit.Q);

      expect(
        addRateSchema.parse({
          commodity_id: 1,
          unit_price: 150,
          unit: Unit.GAL,
        }).unit,
      ).toBe(Unit.GAL);
    });

    it("rejects invalid unit", () => {
      expect(() =>
        addRateSchema.parse({
          commodity_id: 1,
          unit_price: 100,
          unit: "tons",
        }),
      ).toThrow();
    });

    it("rejects zero or negative unit price", () => {
      expect(() =>
        addRateSchema.parse({
          commodity_id: 1,
          unit_price: 0,
          unit: Unit.KG,
        }),
      ).toThrow();

      expect(() =>
        addRateSchema.parse({
          commodity_id: 1,
          unit_price: -50,
          unit: Unit.KG,
        }),
      ).toThrow();
    });

    it("rejects missing commodity_id", () => {
      expect(() =>
        addRateSchema.parse({
          unit_price: 100,
          unit: Unit.KG,
        }),
      ).toThrow();
    });
  });

  describe("editRateSchema", () => {
    it("is identical to addRateSchema requirements", () => {
      expect(editRateSchema).toBe(addRateSchema);
    });
  });
});
