import { describe, expect, it, vi, beforeEach } from "vitest";
import { downloadPDF, printPdf } from "./exporter";
import { getExportFileName } from "@/lib/utils/export";
import { type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";

vi.mock("./template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./template")>();
  return {
    ...actual,
  };
});

describe("PDF Exporter (downloadPDF & printPdf)", () => {
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

  it("generates standardized PDF export file names", () => {
    const fileName = getExportFileName("Weighments", "pdf", "Punjab Sugar Mill");
    expect(fileName).toMatch(/^punjab_sugar_mill_weighments_export_\d{8}_\d{6}\.pdf$/);
  });

  it("creates an iframe to trigger browser print dialog in printPdf", () => {
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => null!);
    printPdf("<html><body>Print test</body></html>", "test_export.pdf");

    expect(appendChildSpy).toHaveBeenCalled();
    const createdIframe = appendChildSpy.mock.calls[0][0] as HTMLIFrameElement;
    expect(createdIframe.tagName).toBe("IFRAME");
    expect(createdIframe.srcdoc).toBe("<html><body>Print test</body></html>");

    appendChildSpy.mockRestore();
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

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => null!);

    downloadPDF(table, "Entries", "Apex Industries");

    expect(appendChildSpy).toHaveBeenCalled();
    const iframe = appendChildSpy.mock.calls[0][0] as HTMLIFrameElement;
    const generatedHtml = iframe.srcdoc;

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
    expect(generatedHtml).toContain('src="https://example.com/scan1.jpg"');
    expect(generatedHtml).toContain('src="https://example.com/scan2.jpg"');
    expect(generatedHtml).toContain("pdf-scan-card");

    // Typography with Inter font
    expect(generatedHtml).toContain("family=Inter");
    expect(generatedHtml).toContain("font-family: 'Inter'");

    // Page settings: landscape and print-color-adjust
    expect(generatedHtml).toContain("size: landscape");
    expect(generatedHtml).toContain("print-color-adjust: exact");

    appendChildSpy.mockRestore();
  });

  it("handles tables without an images column without errors", () => {
    const tableWithoutImages = {
      getFilteredSelectedRowModel: () => ({
        rows: [
          {
            id: "1",
            original: { id: 1, name: "Acme Sugars" },
            getValue: (colId: string) => (colId === "name" ? "Acme Sugars" : 1),
          },
        ],
      }),
      getVisibleLeafColumns: () => [
        { id: "id", columnDef: { meta: { label: "ID" } } },
        { id: "name", columnDef: { meta: { label: "Name" } } },
      ],
      getColumn: (id: string) => (id === "images" ? undefined : {}),
    } as unknown as Table<ProjectTableFeatures, Record<string, unknown>>;

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => null!);

    expect(() => downloadPDF(tableWithoutImages, "Settings", "Acme")).not.toThrow();

    expect(appendChildSpy).toHaveBeenCalled();
    const iframe = appendChildSpy.mock.calls[0][0] as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain("Acme Sugars");

    appendChildSpy.mockRestore();
  });

  it("exports multiple rows with scan cards having pdf-scan-card class and avoid page breaks", () => {
    const table = createMockTable([
      {
        id: 1,
        vehicle_number: "PB10XY1234",
        images: ["https://example.com/scan1.jpg"],
        created_at: "2026-08-27T20:54:16.000Z",
      },
      {
        id: 2,
        vehicle_number: "MH12AB5678",
        images: ["https://example.com/scan2.jpg", "https://example.com/scan3.jpg"],
        created_at: "2026-08-27T20:54:16.000Z",
      },
    ]);

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => null!);

    downloadPDF(table, "Weighments", "Apex Industries");

    expect(appendChildSpy).toHaveBeenCalled();
    const iframe = appendChildSpy.mock.calls[0][0] as HTMLIFrameElement;
    const generatedHtml = iframe.srcdoc;

    expect(generatedHtml).toContain("2 Records");
    expect(generatedHtml).toContain("Record #1");
    expect(generatedHtml).toContain("Record #2");
    expect(generatedHtml).toContain("PB10XY1234");
    expect(generatedHtml).toContain("MH12AB5678");

    // Both scan cards should have pdf-scan-card class in HTML
    const scanCardMatches = generatedHtml.match(/class="pdf-scan-card/g);
    expect(scanCardMatches?.length).toBe(2);

    appendChildSpy.mockRestore();
  });

  it("exports single row using rowsOverride in downloadPDF", () => {
    const table = createMockTable([
      {
        id: 1,
        vehicle_number: "PB10XY1234",
        images: ["https://example.com/scan1.jpg"],
        created_at: "2026-08-27T20:54:16.000Z",
      },
      {
        id: 2,
        vehicle_number: "MH12AB5678",
        images: [],
        created_at: "2026-08-27T20:54:16.000Z",
      },
    ]);

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => null!);

    const singleRow = table.getFilteredSelectedRowModel().rows[1];
    downloadPDF(table, "Entries", "Apex Industries", [singleRow]);

    expect(appendChildSpy).toHaveBeenCalled();
    const iframe = appendChildSpy.mock.calls[0][0] as HTMLIFrameElement;
    const generatedHtml = iframe.srcdoc;

    expect(generatedHtml).toContain("MH12AB5678");
    expect(generatedHtml).not.toContain("PB10XY1234");

    appendChildSpy.mockRestore();
  });
});
