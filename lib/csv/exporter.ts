/**
 * @file lib/csv/exporter.ts
 * @description CSV and PDF export utilities for table records with image rendering and IST date formatting.
 */

import { type RowData, type Table, type Row } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { useAuthStore } from "@/lib/store";
import { formatDateTime } from "../utils";
import { printPdf } from "../pdf/exporter";
import { generatePdfHtml } from "../pdf/template";

const DATE_COLUMN_IDS = new Set<string>([
  "created_at",
  "updated_at",
  "in_entry_created_at",
  "out_entry_created_at",
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
  rowsOverride?: Row<ProjectTableFeatures, TData>[],
) {
  const finalCompanyName = companyName || useAuthStore.getState().user?.factory_name || "Gluvok";
  const fileName = getExportFileName(projectName, "pdf", finalCompanyName);

  const selectedRows = rowsOverride ?? table.getFilteredSelectedRowModel().rows;
  const cols = table.getVisibleLeafColumns().filter((c) => c.id !== "select" && c.id !== "actions");
  const headersHtml = cols
    .map(
      (c) =>
        `<th class="px-4 py-3 bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold text-left text-2xs uppercase tracking-wider">${(c.columnDef.meta as Record<string, unknown>)?.label || c.id}</th>`,
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
            return `<td class="px-4 py-3 border-b border-slate-100 text-xs text-slate-700 align-middle"><span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-mono">${val.length} image${val.length === 1 ? "" : "s"}</span></td>`;
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
    const rawImages = (row.getValue("images") || rowOrig["images"]) as string[] | undefined;
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      const id = String(rowOrig["id"] ?? row.id);
      const vehicleNumber = (rowOrig["vehicle_number"] as string) || undefined;
      imagesList.push({ id, vehicleNumber, images: rawImages });
    }
  });

  let imagesHtml: string | undefined;
  if (imagesList.length > 0) {
    imagesHtml = imagesList
      .map(
        (group) => `
        <div class="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 break-inside-avoid">
          <div class="font-semibold text-xs text-slate-700 mb-3 flex items-center justify-between">
            <span>Record #${group.id}${group.vehicleNumber ? ` &bull; Vehicle: ${group.vehicleNumber}` : ""}</span>
            <span class="text-slate-500 font-normal">${group.images.length} attachment${group.images.length === 1 ? "" : "s"}</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${group.images
            .map(
              (url) => `
              <div class="aspect-video bg-white rounded-lg overflow-hidden border border-slate-200 shadow-2xs flex items-center justify-center">
                <img src="${url}" alt="Attachment for Record #${group.id}" class="w-full h-full object-cover" />
              </div>`,
            )
            .join("")}
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
  const finalCompanyName = companyName || useAuthStore.getState().user?.factory_name || "Gluvok";
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
