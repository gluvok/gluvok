/**
 * @file lib/csv/exporter.ts
 * @description CSV and PDF export utilities for table records with image rendering and IST date formatting.
 */

import { type RowData, type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { EntityKey } from "@/lib/constants/enums";
import { formatDateTime } from "../utils";
import { printPdf } from "../pdf/exporter";
import { generatePdfHtml } from "../pdf/template";

const DATE_COLUMN_IDS = new Set<string>([
  EntityKey.CREATED_AT,
  EntityKey.UPDATED_AT,
  EntityKey.IN_ENTRY_CREATED_AT,
  EntityKey.OUT_ENTRY_CREATED_AT,
]);

/**
 * Downloads the selected rows in a table as a PDF with inline image thumbnails and full scan gallery.
 */
export function downloadPDF<TData extends RowData>(
  table: Table<ProjectTableFeatures, TData>,
  projectName: string,
) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const cols = table.getVisibleLeafColumns().filter((c) => c.id !== "select" && c.id !== "actions");
  const headersHtml = cols
    .map((c) => `<th>${(c.columnDef.meta as Record<string, unknown>)?.label || c.id}</th>`)
    .join("");

  const rowsHtml = selectedRows
    .map((row) => {
      const cells = cols
        .map((c) => {
          const val = row.getValue(c.id);
          if (Array.isArray(val)) {
            if (val.length === 0) return "<td>—</td>";
            return `<td>${val.length} image${val.length === 1 ? "" : "s"}</td>`;
          }
          if (DATE_COLUMN_IDS.has(c.id)) {
            return `<td>${formatDateTime(val as string)}</td>`;
          }
          return `<td>${val !== null && val !== undefined && val !== "" ? String(val) : "—"}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  // Collect image attachments for appendix gallery
  const imagesList: { id: string; vehicleNumber?: string; images: string[] }[] = [];
  selectedRows.forEach((row) => {
    const rowOrig = (row.original as Record<string, unknown>) || {};
    const rawImages = (row.getValue(EntityKey.IMAGES) || rowOrig[EntityKey.IMAGES]) as
      | string[]
      | undefined;
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      const id = String(rowOrig[EntityKey.ID] ?? row.id);
      const vehicleNumber = (rowOrig[EntityKey.VEHICLE_NUMBER] as string) || undefined;
      imagesList.push({ id, vehicleNumber, images: rawImages });
    }
  });

  let imagesHtml: string | undefined;
  if (imagesList.length > 0) {
    imagesHtml = `
      <div class="pdf-scans-header">
        <h2>Attached Scans & Images</h2>
      </div>
      <div class="pdf-scans-grid">
        ${imagesList
          .map(
            (item) => `
          <div class="pdf-scan-card">
            <div class="pdf-scan-card-header">
              Record #${item.id}${item.vehicleNumber ? ` &bull; Vehicle: ${item.vehicleNumber}` : ""}
            </div>
            <div class="pdf-scan-card-images">
              ${item.images
                .map(
                  (img, idx) => `
                <div class="pdf-scan-img-container">
                  <img src="${img}" alt="Scan ${idx + 1}" class="pdf-scan-full-img" />
                  <div class="pdf-scan-caption">Image ${idx + 1}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  printPdf(generatePdfHtml(projectName, headersHtml, rowsHtml, selectedRows.length, imagesHtml));
}

/**
 * Downloads the selected rows in a table as a CSV.
 */
export function downloadCSV<TData extends RowData>(
  table: Table<ProjectTableFeatures, TData>,
  projectName: string,
) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const cols = table.getVisibleLeafColumns().filter((c) => c.id !== "select" && c.id !== "actions");
  const headers = cols
    .map((c) => {
      const label = (c.columnDef.meta as Record<string, unknown>)?.label || c.id;
      return `"${String(label).replace(/"/g, '""')}"`;
    })
    .join(",");

  const rows = selectedRows
    .map((row) => {
      return cols
        .map((c) => {
          const val = row.getValue(c.id);
          let cellVal = "";
          if (Array.isArray(val)) {
            cellVal = val.join("; ");
          } else if (DATE_COLUMN_IDS.has(c.id)) {
            cellVal = formatDateTime(val as string);
          } else {
            cellVal = String(val ?? "");
          }
          return `"${cellVal.replace(/"/g, '""')}"`;
        })
        .join(",");
    })
    .join("\n");

  const csvContent = `${headers}\n${rows}`;
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);

  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute(
    "download",
    `${projectName.toLowerCase().replace(/\s+/g, "_")}_export_${timestamp}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
