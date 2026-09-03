/**
 * @file lib/utils/index.ts
 * @description General utility helper functions for class merging, date formatting, and string splitting.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn utility
 * Merges and filters Tailwind classes securely using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatDateTime utility
 * Converts ISO date strings / Dates into human-readable IST (Asia/Kolkata) strings (e.g. 28 Aug 2026, 02:24 AM).
 */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr.replace(" ", "T")) : dateStr;
    if (date instanceof Date && !isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).formatToParts(date);

      const day = parts.find((p) => p.type === "day")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const year = parts.find((p) => p.type === "year")?.value;
      const hour = parts.find((p) => p.type === "hour")?.value;
      const minute = parts.find((p) => p.type === "minute")?.value;
      const second = parts.find((p) => p.type === "second")?.value;
      const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value || "").toUpperCase();

      return `${day} ${month} ${year}, ${hour}:${minute}:${second} ${dayPeriod}`;
    }
  } catch {}
  return String(dateStr);
}

/**
 * getDisplayName utility
 * Resolves a friendly display name for an image source path, local file name, or backup index.
 */
export function getDisplayName(src: string, fileName: string | undefined, index: number): string {
  if (fileName) return fileName;
  if (src.startsWith("data:")) return `Image ${index + 1}`;
  // extract basename from path
  const parts = src.split("/");
  return parts[parts.length - 1] || `Image ${index + 1}`;
}

/**
 * splitFileName utility
 * Splits a file name string into two elements: its name segment and its extension segment.
 */
export function splitFileName(filename: string): [string, string] {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) return [filename, ""];
  return [filename.slice(0, lastDotIndex), filename.slice(lastDotIndex)];
}

/**
 * getNextParam utility
 * Extracts the 'next' parameter value from the current window location search parameters safely.
 */
export function getNextParam(): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const nextParam = searchParams.get("next");
  return nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
}

/**
 * getNextRedirectUrl utility
 * Generates a URL string that appends the current path and query parameters as a 'next' redirect query parameter.
 */
export function getNextRedirectUrl(baseUrl: string, pathname: string): string {
  if (typeof window === "undefined" || !pathname) return baseUrl;
  const nextParamValue = pathname + window.location.search;
  return `${baseUrl}?next=${encodeURIComponent(nextParamValue)}`;
}

export { getSingularName } from "@/lib/fields";
export { useTable } from "@tanstack/react-table";
