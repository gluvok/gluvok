/**
 * @file lib/utils/export.ts
 * @description Shared utilities for file naming and date-time column definitions in exports.
 */

export const DATE_COLUMN_IDS = new Set<string>([
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
