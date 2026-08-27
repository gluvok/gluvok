/**
 * @file lib/csv/exporter.ts
 * @description CSV and PDF export utilities for table records with image rendering and IST date formatting.
 */

import { type RowData, type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { EntityKey } from "@/lib/constants/enums";
import { useFactoryStore } from "@/lib/store/factory";
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
 * Generates a standardized export file name combining company name, project name,
 * and current IST date-time timestamp.
 * Format: [company]_[project]_export_YYYYMMDD_HHMMSS.[ext]
 */
export function getExportFileName(
  projectName: string,
  extension: "csv" | "pdf",
  companyName?: string,
): string {
  const companySlug =
    (companyName || "gluvok")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "gluvok";
  const projectSlug =
    projectName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "export";

  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const second = parts.find((p) => p.type === "second")?.value || "00";

  const timestamp = `${year}${month}${day}_${hour}${minute}${second}`;
  return `${companySlug}_${projectSlug}_export_${timestamp}.${extension}`;
}

/**
 * Downloads the selected rows in a table as a PDF with inline image count, company name, and full scan gallery.
 */
export function downloadPDF<TData extends RowData>(
  table: Table<ProjectTableFeatures, TData>,
  projectName: string,
  companyName?: string,
) {
  const finalCompanyName = companyName || useFactoryStore.getState().factory?.name || "Gluvok";
  const fileName = getExportFileName(projectName, "pdf", finalCompanyName);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const cols = table.getVisibleLeafColumns().filter((c) => c.id !== "select" && c.id !== "actions");
  const headersHtml = cols
    .map(
      (c) =>
        `<th class="px-4 py-3 bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold text-left text-[10px] uppercase tracking-wider">${(c.columnDef.meta as Record<string, unknown>)?.label || c.id}</th>`,
    )
    .join("");

  const rowsHtml = selectedRows
    .map((row) => {
      const cells = cols
        .map((c) => {
          const val = row.getValue(c.id);
          if (Array.isArray(val)) {
            if (val.length === 0)
              return '<td class="px-4 py-3 border-b border-slate-100 text-xs text-slate-400 align-middle">—</td>';
            return `<td class="px-4 py-3 border-b border-slate-100 text-xs text-slate-700 align-middle"><span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-mono">${val.length} image${val.length === 1 ? "" : "s"}</span></td>`;
          }
          if (DATE_COLUMN_IDS.has(c.id)) {
            return `<td class="px-4 py-3 border-b border-slate-100 text-xs text-slate-600 align-middle font-mono">${formatDateTime(val as string)}</td>`;
          }
          return `<td class="px-4 py-3 border-b border-slate-100 text-xs text-slate-900 align-middle font-medium">${val !== null && val !== undefined && val !== "" ? String(val) : '<span class="text-slate-400">—</span>'}</td>`;
        })
        .join("");
      return `<tr class="even:bg-slate-50/40 hover:bg-slate-50/80 transition-colors">${cells}</tr>`;
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
    imagesHtml = imagesList
      .map(
        (item) => `
      <div class="pdf-scan-wrapper pt-6 first:pt-0">
        <div class="pdf-scan-card rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm">
          <div class="pdf-scan-card-header pb-3 mb-4 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-900 text-white font-mono shadow-2xs">Record #${item.id}</span>
              ${item.vehicleNumber ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs">Vehicle: ${item.vehicleNumber}</span>` : ""}
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono bg-slate-100 text-slate-600 border border-slate-200">${item.images.length} photo${item.images.length === 1 ? "" : "s"} attached</span>
          </div>
          <div class="pdf-scan-card-images flex flex-wrap gap-4">
            ${item.images
              .map(
                (img, idx) => `
              <div class="pdf-scan-img-container rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col items-center">
                <div class="flex items-center justify-center p-2 bg-slate-50/40 min-w-[160px] min-h-[140px]">
                  <img src="${img}" alt="Scan ${idx + 1}" class="pdf-scan-full-img max-w-[280px] max-h-[220px] w-auto h-auto object-contain rounded-md" />
                </div>
                <div class="pdf-scan-caption w-full text-[10px] font-mono font-semibold text-slate-600 text-center py-1.5 px-3 bg-slate-50 border-t border-slate-100">
                  Image ${idx + 1}
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  printPdf(
    generatePdfHtml(
      projectName,
      headersHtml,
      rowsHtml,
      selectedRows.length,
      imagesHtml,
      finalCompanyName,
      fileName,
    ),
    fileName,
  );
}

/**
 * Downloads the selected rows in a table as a CSV with standardized file name.
 */
export function downloadCSV<TData extends RowData>(
  table: Table<ProjectTableFeatures, TData>,
  projectName: string,
  companyName?: string,
) {
  const finalCompanyName = companyName || useFactoryStore.getState().factory?.name || "Gluvok";
  const fileName = getExportFileName(projectName, "csv", finalCompanyName);

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
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
