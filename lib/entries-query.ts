/**
 * @file lib/entries-query.ts
 * @description Shared backend query utilities for entries endpoints (/api/entries/automatic and /api/entries/manual).
 * Deduplicates search weight parsing, filter extraction, in-memory relational sorting, and pagination slicing.
 */

import type { SortRule, PaginationParams } from "@/lib/api-query";

export interface SortableEntry {
  id: number;
  weight: number | string;
  center?: { name?: string | null } | null;
  customer?: { name?: string | null } | null;
  created_by_user?: { name?: string | null } | null;
}

/**
 * Extracts numeric weight when a user searches for numeric values or values ending in 'kg'.
 * Returns null if the search term is not a positive number.
 */
export function parseNumericWeight(search: string): number | null {
  const numericStr = search.replace(/[, ]/g, "").replace(/kg$/i, "");
  const numericVal = Number(numericStr);
  return !isNaN(numericVal) && numericStr.length > 0 && numericVal > 0 ? numericVal : null;
}

/**
 * Applies common center_id and customer_id filters from URL search params to an entries query.
 */
export function applyCommonEntriesFilters<
  TQuery extends {
    eq(col: string, val: number): TQuery;
  },
>(query: TQuery, searchParams: URLSearchParams): TQuery {
  let updated = query;

  const centerId = searchParams.get("center_id")?.trim();
  if (centerId && centerId !== "all") {
    const parsedCenterId = Number(centerId);
    if (!isNaN(parsedCenterId)) {
      updated = updated.eq("center_id", parsedCenterId);
    }
  }

  const customerId = searchParams.get("customer_id")?.trim();
  if (customerId && customerId !== "all") {
    const parsedCustomerId = Number(customerId);
    if (!isNaN(parsedCustomerId)) {
      updated = updated.eq("customer_id", parsedCustomerId);
    }
  }

  return updated;
}

/**
 * Sorts entries in-memory when sorting across relational joins (center.name, customer.name, created_by_user.name)
 * or composite fields, strictly following multi-column precedence rules.
 */
export function sortEntriesRelational<T extends SortableEntry>(
  entries: T[],
  sortRules: readonly SortRule<string>[],
): T[] {
  return [...entries].sort((a, b) => {
    for (const rule of sortRules) {
      let valA: string | number = "";
      let valB: string | number = "";

      if (rule.col === "center") {
        valA = a.center?.name ?? "";
        valB = b.center?.name ?? "";
      } else if (rule.col === "customer") {
        valA = a.customer?.name ?? "";
        valB = b.customer?.name ?? "";
      } else if (rule.col === "created_by") {
        valA = a.created_by_user?.name ?? "";
        valB = b.created_by_user?.name ?? "";
      } else if (rule.col === "weight" || rule.col === "id") {
        valA = Number((a as Record<string, unknown>)[rule.col] ?? 0);
        valB = Number((b as Record<string, unknown>)[rule.col] ?? 0);
      } else {
        valA = String((a as Record<string, unknown>)[rule.col] ?? "");
        valB = String((b as Record<string, unknown>)[rule.col] ?? "");
      }

      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      if (comparison !== 0) {
        return rule.ascending ? comparison : -comparison;
      }
    }
    return 0;
  });
}

/**
 * Slices an in-memory array for pagination.
 */
export function paginateInMemory<T>(items: T[], pagination: PaginationParams): T[] {
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  return items.slice(startIndex, startIndex + pagination.pageSize);
}
