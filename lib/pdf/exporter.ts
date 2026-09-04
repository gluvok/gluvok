/**
 * @file lib/pdf/exporter.ts
 * @description PDF export utilities for table records with scan attachments and executive formatting.
 */

import { type RowData, type Table, type Row } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { useAuthStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import { DATE_COLUMN_IDS, getExportFileName } from "@/lib/utils/export";
import { generatePdfHtml } from "./template";
import { MANDATORY_PDF_FIELDS, inferProjectSlug, type MandatoryPdfField } from "./config";
import { printPdf } from "./print";

export { MANDATORY_PDF_FIELDS, printPdf, type MandatoryPdfField };

/**
 * Downloads the selected rows in a table as a styled PDF with company branding,
 * inline image badges, IST date formatting, and an attached scan gallery.
 */
export function downloadPDF<TData extends RowData>(
  table: Table<ProjectTableFeatures, TData>,
  projectName: string,
  companyName?: string,
  rowsOverride?: Row<ProjectTableFeatures, TData>[],
  projectSlug?: string,
) {
  const finalCompanyName = companyName || useAuthStore.getState().user?.factory_name || "Gluvok";
  const fileName = getExportFileName(projectName, "pdf", finalCompanyName);

  const selectedRows = rowsOverride ?? table.getFilteredSelectedRowModel().rows;
  const effectiveProjectSlug =
    projectSlug ||
    (table.options?.meta as { projectSlug?: string } | undefined)?.projectSlug ||
    inferProjectSlug(projectName);

  const mandatoryConfigs = MANDATORY_PDF_FIELDS[effectiveProjectSlug] || [];

  const allLeafCols =
    (typeof table.getAllLeafColumns === "function" ? table.getAllLeafColumns() : null) ||
    (typeof table.getVisibleLeafColumns === "function" ? table.getVisibleLeafColumns() : []);

  const visibleLeafCols =
    typeof table.getVisibleLeafColumns === "function" ? table.getVisibleLeafColumns() : allLeafCols;

  interface PdfColDescriptor {
    id: string;
    label: string;
  }

  const cols: PdfColDescriptor[] = [];
  const addedColIds = new Set<string>();

  // 1. Mandatory columns first
  for (const field of mandatoryConfigs) {
    const matchingCol = allLeafCols.find((c) => c.id === field.id);
    const label =
      (matchingCol?.columnDef?.meta as Record<string, unknown> | undefined)?.label || field.label;
    const colId = matchingCol?.id || field.id;
    cols.push({
      id: colId,
      label: String(label),
    });
    addedColIds.add(colId);
  }

  // 2. Remaining visible columns
  for (const col of visibleLeafCols) {
    if (col.id === "select" || col.id === "actions") continue;
    if (!addedColIds.has(col.id)) {
      const label = (col.columnDef.meta as Record<string, unknown> | undefined)?.label || col.id;
      cols.push({
        id: col.id,
        label: String(label),
      });
      addedColIds.add(col.id);
    }
  }

  const headersHtml = cols
    .map(
      (c) =>
        `<th class="px-4 py-3 bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold text-left text-2xs uppercase tracking-wider">${c.label}</th>`,
    )
    .join("");

  const rowsHtml = selectedRows
    .map((row) => {
      const rowOrig = (row.original as Record<string, unknown>) || {};
      const cells = cols
        .map((c) => {
          let val: unknown = undefined;
          if (typeof row.getValue === "function") {
            try {
              val = row.getValue(c.id);
            } catch {
              val = undefined;
            }
          }
          if (val === undefined || val === null) {
            val = rowOrig[c.id];
          }

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
    let rawImages: unknown = undefined;
    if (typeof row.getValue === "function") {
      try {
        rawImages = row.getValue("images");
      } catch {
        rawImages = undefined;
      }
    }
    if (!rawImages) {
      rawImages = rowOrig["images"];
    }
    if (Array.isArray(rawImages) && Array.isArray(rawImages) && rawImages.length > 0) {
      const id = String(rowOrig["id"] ?? row.id);
      const vehicleNumber = (rowOrig["vehicle_number"] as string) || undefined;
      imagesList.push({ id, vehicleNumber, images: rawImages as string[] });
    }
  });

  let imagesHtml: string | undefined;
  if (imagesList.length > 0) {
    imagesHtml = imagesList
      .map(
        (group) => `
        <div class="pdf-scan-card mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 break-inside-avoid">
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
