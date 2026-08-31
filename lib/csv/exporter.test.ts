import { describe, expect, it, vi, beforeEach } from "vitest";
import { downloadCSV, getExportFileName } from "./exporter";
import { type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";

describe("CSV Exporter (downloadCSV & getExportFileName)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockTable = (rows: Array<Record<string, unknown>>) => {
    const mockColumns = [
      { id: "id", columnDef: { meta: { label: "ID" } } },
      { id: "vehicle_number", columnDef: { meta: { label: "Vehicle Number" } } },
      { id: "images", columnDef: { meta: { label: "Images" } } },
      { id: "created_at", columnDef: { meta: { label: "Created At" } } },
    ];

    const mockRows = rows.map((r) => ({
      id: String(r.id),
      original: r,
      getValue: (colId: string) => r[colId],
    }));

    return {
      getFilteredSelectedRowModel: () => ({ rows: mockRows }),
      getVisibleLeafColumns: () => mockColumns,
    } as unknown as Table<ProjectTableFeatures, Record<string, unknown>>;
  };

  it("generates standardized CSV export file names", () => {
    const csvName = getExportFileName("Entries", "csv", "Lathey Weigh Trix");
    expect(csvName).toMatch(/^lathey_weigh_trix_entries_export_\d{8}_\d{6}\.csv$/);
  });

  it("exports semicolon-separated image URLs and IST formatted dates with standardized filename in CSV", () => {
    const table = createMockTable([
      {
        id: 1,
        vehicle_number: "PB10XY1234",
        images: ["https://example.com/scan1.jpg", "https://example.com/scan2.jpg"],
        created_at: "2026-08-27T20:54:16.000Z",
      },
    ]);

    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    global.URL.createObjectURL = createObjectURLMock;
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => null!);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => null!);

    downloadCSV(table, "Entries", "Apex Industries");

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
