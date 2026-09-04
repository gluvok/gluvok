/**
 * @file lib/fields/helpers.ts
 * @description Helper definitions and re-exports for entity table fields and icons.
 */

import { ProjectSlug } from "@/lib/constants/enums";

export * from "./icons";

export function getPrimaryIdKey(_slug?: string | ProjectSlug): string {
  return "id";
}

export function getReferencedEntitySlug(key: string): string | null {
  switch (key) {
    case "commodity_id":
    case "commodity_name":
      return ProjectSlug.COMMODITIES;
    case "rate_id":
      return ProjectSlug.RATES;
    case "center_id":
      return ProjectSlug.CENTERS;
    case "customer_id":
      return ProjectSlug.CUSTOMERS;
    case "user_id":
      return ProjectSlug.USERS;
    default:
      return null;
  }
}

export function isCommoditySlug(slug: string | ProjectSlug): boolean {
  return slug === ProjectSlug.COMMODITIES;
}

export function getSelectPlaceholder(entity: string): string {
  return `Select ${entity.toLowerCase()}...`;
}

export function getSingularName(name: string): string {
  switch (name) {
    case "Centers":
      return "Center";
    case "Commodities":
      return "Commodity";
    case "Rates":
      return "Rate";
    case "Customers":
      return "Customer";
    case "Weighments":
      return "Weighment";
    case "Factories":
      return "Factory";
    case "Users":
      return "User";
    case "Entries":
      return "Entry";
    case "Settings":
      return "Setting";

    default:
      if (name.endsWith("ies")) {
        return name.slice(0, -3) + "y";
      }
      if (name.endsWith("s")) {
        return name.slice(0, -1);
      }
      return name;
  }
}
