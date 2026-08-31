/**
 * @file lib/pdf/exporter.ts
 * @description PDF export utilities and print handlers for table records with scan attachments and executive formatting.
 */

import { type RowData, type Table, type Row } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { useAuthStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import { DATE_COLUMN_IDS, getExportFileName } from "@/lib/utils/export";
import { generatePdfHtml } from "./template";
import { toast } from "sonner";

/**
 * Triggers the browser print dialog for an HTML content string via an invisible iframe.
 */
export function printPdf(htmlContent: string, fileName?: string) {
  const originalTitle = typeof document !== "undefined" ? document.title : "";
  const exportTitle = fileName ? fileName.replace(/\.pdf$/i, "") : "";

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  iframe.onload = () => {
    try {
      if (exportTitle && typeof document !== "undefined") {
        document.title = exportTitle;
        if (iframe.contentDocument) {
          iframe.contentDocument.title = exportTitle;
        }
      }
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      toast.error("Failed to trigger print dialog.");
    } finally {
      setTimeout(() => {
        if (typeof document !== "undefined" && originalTitle) {
          document.title = originalTitle;
        }
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  };

  iframe.srcdoc = htmlContent;
  document.body.appendChild(iframe);
}

/**
 * Downloads the selected rows in a table as a styled PDF with company branding,
 * inline image badges, IST date formatting, and an attached scan gallery.
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
