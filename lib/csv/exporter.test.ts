import { describe, expect, it, vi, beforeEach } from "vitest";
import { downloadPDF, downloadCSV } from "./exporter";
import { printPdf } from "../pdf/exporter";
import { type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";

vi.mock("../pdf/exporter", () => ({
  printPdf: vi.fn(),
}));

describe("downloadPDF and downloadCSV", () => {
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

  it("renders image count in table cell, IST formatted dates, and full scans in generated PDF HTML", () => {
    const table = createMockTable([
      {
        id: 1,
        vehicle_number: "PB10XY1234",
        images: ["https://example.com/scan1.jpg", "https://example.com/scan2.jpg"],
        created_at: "2026-08-27T20:54:16.000Z",
      },
    ]);

    downloadPDF(table, "Entries");

    expect(printPdf).toHaveBeenCalledTimes(1);
    const generatedHtml = vi.mocked(printPdf).mock.calls[0][0];

    // Image count inside table cell
    expect(generatedHtml).toContain("<td>2 images</td>");

    // IST date formatting
    expect(generatedHtml).toContain("28 Aug 2026, 02:24 AM");

    // Attached scan gallery section with images
    expect(generatedHtml).toContain("Attached Scans & Images");
    expect(generatedHtml).toContain("Vehicle: PB10XY1234");
    expect(generatedHtml).toContain(
      'src="https://example.com/scan1.jpg" alt="Scan 1" class="pdf-scan-full-img"',
    );
    expect(generatedHtml).toContain(
      'src="https://example.com/scan2.jpg" alt="Scan 2" class="pdf-scan-full-img"',
    );
  });

  it("exports semicolon-separated image URLs and IST formatted dates in CSV", () => {
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

    downloadCSV(table, "Entries");

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLMock.mock.calls[0][0] as Blob;
    expect(blobArg).toBeDefined();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
