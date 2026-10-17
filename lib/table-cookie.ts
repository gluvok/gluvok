import type { ColumnVisibilityState, SortingState, PaginationState } from "@tanstack/react-table";

export const TABLES_COOKIE_NAME = "gluvok_tables_state";
export const TABLES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface TableItemState {
  search: string;
  filters: Record<string, string>;
  dateRange: { from?: string; to?: string } | undefined;
  sorting: SortingState;
  pagination: PaginationState;
  columnVisibility: ColumnVisibilityState;
}

export const DEFAULT_TABLE_ITEM_STATE: TableItemState = {
  search: "",
  filters: {},
  dateRange: undefined,
  sorting: [],
  pagination: { pageIndex: 0, pageSize: 15 },
  columnVisibility: {},
};

export type PrunedTableState = Partial<{
  search: string;
  filters: Record<string, string>;
  dateRange: { from?: string; to?: string };
  sorting: SortingState;
  pagination: Partial<PaginationState>;
  columnVisibility: ColumnVisibilityState;
}>;

/**
 * Prunes default/empty values to minimize cookie payload size.
 */
export function pruneTableState(
  tables: Record<string, TableItemState>,
): Record<string, PrunedTableState> {
  const pruned: Record<string, PrunedTableState> = {};

  for (const [tableId, state] of Object.entries(tables)) {
    const item: PrunedTableState = {};

    if (state.search && state.search.trim() !== "") {
      item.search = state.search;
    }

    if (state.filters && Object.keys(state.filters).length > 0) {
      item.filters = state.filters;
    }

    if (state.dateRange?.from) {
      item.dateRange = state.dateRange;
    }

    if (state.sorting && state.sorting.length > 0) {
      item.sorting = state.sorting;
    }

    if (
      state.pagination &&
      (state.pagination.pageIndex !== 0 || state.pagination.pageSize !== 15)
    ) {
      item.pagination = {
        ...(state.pagination.pageIndex !== 0 ? { pageIndex: state.pagination.pageIndex } : {}),
        ...(state.pagination.pageSize !== 15 ? { pageSize: state.pagination.pageSize } : {}),
      };
    }

    if (state.columnVisibility && Object.keys(state.columnVisibility).length > 0) {
      item.columnVisibility = state.columnVisibility;
    }

    if (Object.keys(item).length > 0) {
      pruned[tableId] = item;
    }
  }

  return pruned;
}

/**
 * Serializes pruned table states into a compact JSON string.
 */
export function serializeTablesCookie(tables: Record<string, TableItemState>): string {
  const pruned = pruneTableState(tables);
  return JSON.stringify(pruned);
}

/**
 * Safely parses cookie value (from server cookies() or document.cookie)
 * into a complete Record<string, TableItemState>.
 */
export function parseTablesCookie(rawCookie?: string | null): Record<string, TableItemState> {
  if (!rawCookie) return {};

  try {
    const decoded = rawCookie.includes("%") ? decodeURIComponent(rawCookie) : rawCookie;
    const parsed = JSON.parse(decoded) as Record<string, PrunedTableState>;
    if (!parsed || typeof parsed !== "object") return {};

    const result: Record<string, TableItemState> = {};
    for (const [tableId, pruned] of Object.entries(parsed)) {
      if (!pruned || typeof pruned !== "object") continue;
      result[tableId] = {
        ...DEFAULT_TABLE_ITEM_STATE,
        ...(pruned.search ? { search: pruned.search } : {}),
        ...(pruned.filters ? { filters: pruned.filters } : {}),
        ...(pruned.dateRange ? { dateRange: pruned.dateRange } : {}),
        ...(pruned.sorting ? { sorting: pruned.sorting } : {}),
        ...(pruned.columnVisibility ? { columnVisibility: pruned.columnVisibility } : {}),
        pagination: {
          pageIndex: pruned.pagination?.pageIndex ?? 0,
          pageSize: pruned.pagination?.pageSize ?? 15,
        },
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Writes the serialized table state to document.cookie in the browser.
 */
export function writeTablesCookie(tables: Record<string, TableItemState>): void {
  if (typeof document === "undefined") return;

  const serialized = serializeTablesCookie(tables);
  document.cookie = `${TABLES_COOKIE_NAME}=${encodeURIComponent(serialized)}; path=/; max-age=${TABLES_COOKIE_MAX_AGE}; SameSite=Lax`;
}
