/**
 * @file lib/utils/entity-extractors.ts
 * @description Helpers for mapping raw database records of different types (customers, rates, users)
 * to a standardized `{ id, name }` shape.
 */

import { ProjectSlug } from "@/lib/constants/enums";
import { type Rate, type EntityRecord } from "@/types";

export type Entity = EntityRecord | { id: string; username: string };

/**
 * Standard extractor helper
 * Extract ID and name fields directly from simple database records.
 */
const extractByIdAndName = (item: { id: number; name: string }) => {
  return {
    id: String(item.id),
    name: item.name,
  };
};

/**
 * ENTITY_EXTRACTORS map
 * Registry of mapping functions for converting database rows into `{ id, name }` display properties.
 */
export const ENTITY_EXTRACTORS: Record<string, (item: Entity) => { id: string; name: string }> = {
  [ProjectSlug.CUSTOMERS]: (item) => extractByIdAndName(item as { id: number; name: string }),
  [ProjectSlug.USERS]: (item) => extractByIdAndName(item as { id: number; name: string }),
  [ProjectSlug.CENTERS]: (item) => extractByIdAndName(item as { id: number; name: string }),
  [ProjectSlug.COMMODITIES]: (item) => extractByIdAndName(item as { id: number; name: string }),
  [ProjectSlug.RATES]: (item) => {
    const p = item as Rate;
    const priceInfo = ` (₹${parseFloat(p.unit_price)})`;
    return {
      id: String(p.id),
      name: `${p.commodity_name || "Rate"}${priceInfo}`,
    };
  },
};
