/**
 * @file lib/pdf/exporter.ts
 * @description PDF generation template or style definition for exports (exporter).
 */

import { toast } from "sonner";

export function printPdf(htmlContent: string) {
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
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      toast.error("Failed to trigger print dialog.");
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  };

  iframe.srcdoc = htmlContent;
  document.body.appendChild(iframe);
}
