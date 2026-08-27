/**
 * @file lib/pdf/template.ts
 * @description PDF generation template or style definition for exports (template).
 */

import { PDF_STYLES } from "./styles";
import { formatDateTime } from "../utils";

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
  const logoHtml = `
    <img src="${logoUrl}" height="36" alt="gluvok logo" style="object-fit: contain;" />
  `;
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${finalTitle}</title>
        <style>${PDF_STYLES}</style>
      </head>
      <body>
        <div class="pdf-content-wrapper">
          <header>
            <div class="brand">
              ${logoHtml}
            </div>
            <div class="meta">
              Company: <span class="meta-value">${finalCompanyName}</span><br>
              Document: <span class="meta-value">${projectName} Export</span><br>
              Date: <span class="meta-value">${formatDateTime(new Date())}</span><br>
              Total Records: <span class="meta-value">${selectedCount}</span>
            </div>
          </header>
          <table>
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${imagesHtml ? `<div class="pdf-images-section">${imagesHtml}</div>` : ""}
        </div>
        <footer>
          Generated for ${finalCompanyName} by Gluvok - Lathey Weigh Trix.
        </footer>
      </body>
    </html>
  `;
}
