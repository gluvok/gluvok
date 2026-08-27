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
 * Renders the executive brand header with clean company metadata cards.
 */
export function renderHeaderSection({
  logoUrl,
  finalCompanyName,
  projectName,
  date,
  selectedCount,
}: HeaderSectionOptions): string {
  return `
    <header class="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-6">
      <div class="brand flex flex-col gap-1">
        <img src="${logoUrl}" class="h-9 w-auto object-contain self-start" alt="Gluvok Logo" />
        <span class="text-[10px] font-semibold tracking-widest uppercase text-slate-400">Official System Export</span>
      </div>
      <div class="meta text-right font-sans text-xs">
        <div class="text-base font-bold text-slate-900 tracking-tight leading-none mb-1.5">${projectName} Export</div>
        <div class="text-xs text-slate-500 flex items-center justify-end gap-2 font-mono">
          <span class="font-sans font-semibold text-slate-800">${finalCompanyName}</span>
          <span class="text-slate-300">&bull;</span>
          <span>${date}</span>
          <span class="text-slate-300">&bull;</span>
          <span class="font-sans font-semibold text-slate-900">${selectedCount} Records</span>
        </div>
      </div>
    </header>
  `;
}

/**
 * Renders the styled tabular data section.
 */
export function renderTableSection(headersHtml: string, rowsHtml: string): string {
  return `
    <div class="border border-slate-300 overflow-hidden mb-6">
      <table class="w-full border-collapse text-left text-xs text-slate-700">
        <thead>
          <tr class="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-300">
            ${headersHtml}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renders the attached scans & images gallery section.
 */
export function renderScansSection(imagesHtml?: string): string {
  if (!imagesHtml) return "";
  return `
    <div class="pdf-images-section mt-8 border-t-2 border-slate-900 pt-4">
      <div class="pdf-scans-header mb-3 flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900">Attached Scans & Images</h2>
        <span class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Appendix</span>
      </div>
      <div class="pdf-scans-grid flex flex-col gap-5">
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
    <footer class="fixed bottom-3 left-6 right-6 border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-sans tracking-wide">
      <div>
        Generated for <strong class="text-slate-700 font-semibold">${finalCompanyName}</strong>
      </div>
      <div>
        Powered by <strong class="text-slate-700 font-semibold">Gluvok</strong> &bull; Lathey Weigh Trix
      </div>
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
