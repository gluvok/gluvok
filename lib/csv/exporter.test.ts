import { describe, expect, it, vi, beforeEach } from "vitest";
import { downloadPDF, downloadCSV, getExportFileName } from "./exporter";
import { printPdf } from "../pdf/exporter";
import { type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";

vi.mock("../pdf/exporter", () => ({
  printPdf: vi.fn(),
}));

describe("downloadPDF, downloadCSV and getExportFileName", () => {
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

  it("generates standardized export file names", () => {
    const fileName = getExportFileName("Weighments", "pdf", "Punjab Sugar Mill");
    expect(fileName).toMatch(/^punjab_sugar_mill_weighments_export_\d{8}_\d{6}\.pdf$/);

    const csvName = getExportFileName("Entries", "csv", "Lathey Weigh Trix");
    expect(csvName).toMatch(/^lathey_weigh_trix_entries_export_\d{8}_\d{6}\.csv$/);
  });

  it("renders company name, image count in table cell, IST dates, and scans in generated PDF HTML", () => {
    const table = createMockTable([
      {
        id: 1,
        vehicle_number: "PB10XY1234",
        images: ["https://example.com/scan1.jpg", "https://example.com/scan2.jpg"],
        created_at: "2026-08-27T20:54:16.000Z",
      },
    ]);

    downloadPDF(table, "Entries", "Apex Industries");

    expect(printPdf).toHaveBeenCalledTimes(1);
    expect(printPdf).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^apex_industries_entries_export_\d{8}_\d{6}\.pdf$/),
    );
    const generatedHtml = vi.mocked(printPdf).mock.calls[0][0];

    // Tailwind CDN and Title
    expect(generatedHtml).toContain('<script src="https://cdn.tailwindcss.com"></script>');

    // Company name in meta and title
    expect(generatedHtml).toContain("Apex Industries");
    expect(generatedHtml).toContain("Entries Export");

    // Single record grammar
    expect(generatedHtml).toContain("1 Record");

    // IST date formatting with seconds
    expect(generatedHtml).toContain("28 Aug 2026, 02:24:16 AM");

    // Attached scan gallery section with images
    expect(generatedHtml).toContain("Attached Scans & Images");
    expect(generatedHtml).toContain("PB10XY1234");
    expect(generatedHtml).toContain(
      'src="https://example.com/scan1.jpg" alt="Scan 1" class="pdf-scan-full-img',
    );
    expect(generatedHtml).toContain(
      'src="https://example.com/scan2.jpg" alt="Scan 2" class="pdf-scan-full-img',
    );
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

    let downloadAttr = "";
    const setAttributeSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "setAttribute")
      .mockImplementation(function (this: HTMLAnchorElement, name: string, value: string) {
        if (name === "download") {
          downloadAttr = value;
        }
      });

    downloadCSV(table, "Entries", "Apex Industries");

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(downloadAttr).toMatch(/^apex_industries_entries_export_\d{8}_\d{6}\.csv$/);

    setAttributeSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
