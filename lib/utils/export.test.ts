import { describe, expect, it } from "vitest";
import { getExportFileName, DATE_COLUMN_IDS } from "./export";

describe("Export utilities (lib/utils/export.ts)", () => {
  describe("DATE_COLUMN_IDS", () => {
    it("contains expected date column identifiers", () => {
      expect(DATE_COLUMN_IDS.has("created_at")).toBe(true);
      expect(DATE_COLUMN_IDS.has("updated_at")).toBe(true);
      expect(DATE_COLUMN_IDS.has("in_entry_created_at")).toBe(true);
      expect(DATE_COLUMN_IDS.has("out_entry_created_at")).toBe(true);
      expect(DATE_COLUMN_IDS.has("vehicle_number")).toBe(false);
    });
  });

  describe("getExportFileName", () => {
    it("generates a formatted filename with custom company and project name", () => {
      const filename = getExportFileName("Weighments", "csv", "Acme Sugar Mills");
      expect(filename).toMatch(/^acme_sugar_mills_weighments_export_\d{8}_\d{6}\.csv$/);
    });

    it("defaults to 'gluvok' company slug when company name is omitted", () => {
      const filename = getExportFileName("centers", "pdf");
      expect(filename).toMatch(/^gluvok_centers_export_\d{8}_\d{6}\.pdf$/);
    });

    it("defaults to 'gluvok' when company name is whitespace or special characters", () => {
      const filename = getExportFileName("rates", "csv", "   ###   ");
      expect(filename).toMatch(/^gluvok_rates_export_\d{8}_\d{6}\.csv$/);
    });

    it("sanitizes project names with special characters and spaces", () => {
      const filename = getExportFileName("Daily-Report #1", "csv", "My Company");
      expect(filename).toMatch(/^my_company_daily_report_1_export_\d{8}_\d{6}\.csv$/);
    });

    it("falls back to 'export' if project name is empty after sanitization", () => {
      const filename = getExportFileName("---", "pdf");
      expect(filename).toMatch(/^gluvok_export_export_\d{8}_\d{6}\.pdf$/);
    });
  });
});
