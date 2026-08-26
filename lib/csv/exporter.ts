/**
 * @file lib/csv/exporter.ts
 * @description CSV export utilities for table records (exporter).
 */

import { type Table } from "@tanstack/react-table";
import { printPdf } from "../pdf/exporter";
import { generatePdfHtml } from "../pdf/template";

/**
 * Downloads the selected rows in a table as a PDF.
 */
export function downloadPDF<TData>(table: Table<TData>, projectName: string) {
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
          return `<td>${Array.isArray(val) ? `${val.length} image(s)` : String(val ?? "")}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  printPdf(generatePdfHtml(projectName, headersHtml, rowsHtml, selectedRows.length));
}

/**
 * Downloads the selected rows in a table as a CSV.
 */
export function downloadCSV<TData>(table: Table<TData>, projectName: string) {
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
            cellVal = `${val.length} image(s)`;
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
