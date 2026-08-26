/**
 * @file hooks/use-commodity-icon.ts
 * @description Hook to dynamically resolve the appropriate icon for a commodity based on its name or type.
 */

import { useMemo } from "react";
import { type LucideIcon } from "lucide-react";
import { isCommoditySlug, getCommodityIcon } from "@/lib/fields";
import { type ComboboxOption } from "@/components/combobox/base";

/**
 * useCommodityIcon hook
 * Returns the matching Lucide icon for a given commodity type, using memoized lookup.
 */
export function useCommodityIcon(type: string, selectedItem?: ComboboxOption): LucideIcon | null {
  return useMemo(() => {
    if (isCommoditySlug(type) && selectedItem) {
      return getCommodityIcon(selectedItem.label);
    }
    return null;
  }, [type, selectedItem]);
}
