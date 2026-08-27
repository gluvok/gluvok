/**
 * @file lib/pdf/template.ts
 * @description Modular PDF generation templates and Tailwind-based section partials.
 */

import { PDF_STYLES } from "./styles";
import { formatDateTime } from "../utils";

export interface HeaderSectionOptions {
  logoUrl: string;
  finalCompanyName: string;
  projectName: string;
  date: string;
  selectedCount: number;
}

/**
 * Renders the top header brand logo and document metadata section.
 */
export function renderHeaderSection({
  logoUrl,
  finalCompanyName,
  projectName,
  date,
  selectedCount,
}: HeaderSectionOptions): string {
  return `
    <header class="flex justify-between items-center border-b-2 border-slate-100 pb-5 mb-6">
      <div class="brand flex items-center gap-3">
        <img src="${logoUrl}" class="h-9 object-contain" alt="gluvok logo" />
      </div>
      <div class="meta text-right text-xs text-slate-500 leading-relaxed font-sans">
        <div>Company: <span class="meta-value font-semibold text-slate-900">${finalCompanyName}</span></div>
        <div>Document: <span class="meta-value font-semibold text-slate-900">${projectName} Export</span></div>
        <div>Date: <span class="meta-value font-semibold text-slate-900">${date}</span></div>
        <div>Total Records: <span class="meta-value font-semibold text-slate-900">${selectedCount}</span></div>
      </div>
    </header>
  `;
}

/**
 * Renders the main tabular data section.
 */
export function renderTableSection(headersHtml: string, rowsHtml: string): string {
  return `
    <table class="w-full border-collapse mb-5 text-left text-sm text-slate-700">
      <thead>
        <tr class="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b-2 border-slate-200">
          ${headersHtml}
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

/**
 * Renders the attached scans & images gallery section.
 */
export function renderScansSection(imagesHtml?: string): string {
  if (!imagesHtml) return "";
  return `
    <div class="pdf-images-section mt-4 border-t border-slate-200 pt-4">
      <div class="pdf-scans-header mb-3 border-b-2 border-slate-200 pb-1.5">
        <h2 class="text-sm font-bold text-slate-900">Attached Scans & Images</h2>
      </div>
      <div class="pdf-scans-grid flex flex-col gap-4 my-3">
        ${imagesHtml}
      </div>
    </div>
  `;
}

/**
 * Renders the bottom footer credit and attribution notice.
 */
export function renderFooterSection(finalCompanyName: string): string {
  return `
    <footer class="fixed bottom-3 left-5 right-5 border-t border-slate-100 pt-2.5 text-center text-[11px] font-medium text-slate-400">
      Generated for ${finalCompanyName} by Gluvok - Lathey Weigh Trix.
    </footer>
  `;
}

/**
 * Generates the full standalone HTML page with Tailwind CDN and modular sections.
 */
export function generatePdfHtml(
  projectName: string,
  headersHtml: string,
  rowsHtml: string,
  selectedCount: number,
  imagesHtml?: string,
  companyName?: string,
  fileName?: string,
): string {
  const finalCompanyName = companyName || "Gluvok";
  const finalTitle = fileName
    ? fileName.replace(/\.pdf$/i, "")
    : `${finalCompanyName} - ${projectName} Export`;
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/logo-horizontal.png`
      : "/logo-horizontal.png";
  const formattedDate = formatDateTime(new Date());

  const headerHtml = renderHeaderSection({
    logoUrl,
    finalCompanyName,
    projectName,
    date: formattedDate,
    selectedCount,
  });
  const tableHtml = renderTableSection(headersHtml, rowsHtml);
  const scansHtml = renderScansSection(imagesHtml);
  const footerHtml = renderFooterSection(finalCompanyName);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${finalTitle}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>${PDF_STYLES}</style>
      </head>
      <body class="p-8 sm:p-10 font-sans text-slate-900 bg-white min-h-screen relative flex flex-col">
        <div class="pdf-content-wrapper flex-1 pb-10">
          ${headerHtml}
          ${tableHtml}
          ${scansHtml}
        </div>
        ${footerHtml}
      </body>
    </html>
  `;
}
