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
    <header class="flex justify-between items-start border-b-2 border-slate-900/90 pb-5 mb-6">
      <div class="brand flex flex-col gap-1.5">
        <img src="${logoUrl}" class="h-9 w-auto object-contain self-start" alt="Gluvok Logo" />
        <span class="text-2xs font-bold tracking-widest uppercase text-slate-400">Official System Export</span>
      </div>
      <div class="meta text-right font-sans flex flex-col items-end gap-1.5">
        <div class="text-lg font-extrabold text-slate-900 tracking-tight leading-none">${projectName} Export</div>
        <div class="flex items-center justify-end gap-1.5 flex-wrap">
          <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-slate-900 text-white shadow-2xs">${finalCompanyName}</span>
          <span class="inline-flex items-center px-2.5 py-0.5 text-2xs font-mono text-slate-600 bg-slate-100 border border-slate-200">${date}</span>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span class="w-1.5 h-1.5 bg-emerald-500"></span>
            ${selectedCount} Records
          </span>
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
    <div class="border border-slate-200/90 shadow-sm overflow-hidden mb-6 bg-white">
      <table class="w-full border-collapse text-left text-xs text-slate-700">
        <thead>
          <tr class="bg-slate-50/90 text-slate-700 uppercase text-2xs font-bold tracking-wider border-b border-slate-200">
            ${headersHtml}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
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
    <div class="pdf-images-section mt-8 border-t-2 border-slate-900/90 pt-5">
      <div class="pdf-scans-header mb-4 flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 bg-indigo-600"></span>
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900">Attached Scans & Images</h2>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">Appendix Gallery</span>
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
    <footer class="fixed bottom-3 left-6 right-6 border-t border-slate-200/80 pt-2.5 flex items-center justify-between text-2xs text-slate-400 font-sans tracking-wide">
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
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontSize: {
                  '2xs': ['0.625rem', { lineHeight: 'calc(1 / 0.625)' }],
                },
              },
            },
          };
        </script>
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
