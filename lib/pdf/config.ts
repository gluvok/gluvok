/**
 * @file lib/pdf/config.ts
 * @description Mandatory field definitions and project slug resolution for PDF export documents.
 */

import { ProjectSlug } from "@/lib/constants/enums";

export interface MandatoryPdfField {
  id: string;
  label: string;
}

export const MANDATORY_PDF_FIELDS: Record<string, MandatoryPdfField[]> = {
  [ProjectSlug.WEIGHMENTS]: [
    { id: "id", label: "ID" },
    { id: "vehicle_number", label: "Vehicle Number" },
    { id: "unit", label: "Unit" },
    { id: "gross_weight", label: "Gross Weight" },
    { id: "tare_weight", label: "Tare Weight" },
    { id: "net_weight", label: "Net Weight" },
    { id: "images", label: "Images" },
    { id: "created_at", label: "Created At" },
  ],
  [ProjectSlug.ENTRIES]: [
    { id: "id", label: "ID" },
    { id: "vehicle_number", label: "Vehicle Number" },
    { id: "weight", label: "Weight" },
    { id: "source", label: "Source" },
    { id: "status", label: "Status" },
    { id: "images", label: "Images" },
    { id: "created_at", label: "Created At" },
  ],
  [ProjectSlug.CENTERS]: [
    { id: "id", label: "ID" },
    { id: "name", label: "Name" },
    { id: "auto_approve", label: "Auto Approve" },
    { id: "created_at", label: "Created At" },
  ],
  [ProjectSlug.RATES]: [
    { id: "id", label: "ID" },
    { id: "commodity_name", label: "Commodity" },
    { id: "rate", label: "Rate" },
    { id: "created_at", label: "Created At" },
  ],
  [ProjectSlug.CUSTOMERS]: [
    { id: "id", label: "ID" },
    { id: "name", label: "Customer Name" },
    { id: "phone", label: "Phone" },
    { id: "created_at", label: "Created At" },
  ],
  [ProjectSlug.USERS]: [
    { id: "id", label: "ID" },
    { id: "name", label: "Name" },
    { id: "username", label: "Username" },
    { id: "role", label: "Role" },
    { id: "created_at", label: "Created At" },
  ],
  [ProjectSlug.SETTINGS]: [
    { id: "id", label: "ID" },
    { id: "key", label: "Key" },
    { id: "value", label: "Value" },
    { id: "created_at", label: "Created At" },
  ],
};

export function inferProjectSlug(projectName: string): string {
  const norm = projectName.trim().toLowerCase();
  for (const slug of Object.values(ProjectSlug)) {
    if (norm === slug || norm.includes(slug) || slug.includes(norm)) {
      return slug;
    }
  }
  return norm;
}
