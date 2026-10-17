import { create } from "zustand";
import type {
  ColumnVisibilityState,
  SortingState,
  PaginationState,
  Updater,
} from "@tanstack/react-table";
import {
  type TableItemState,
  DEFAULT_TABLE_ITEM_STATE,
  TABLES_COOKIE_NAME,
  parseTablesCookie,
  writeTablesCookie,
} from "@/lib/table-cookie";

export type { TableItemState };
export { DEFAULT_TABLE_ITEM_STATE };

function resolveUpdater<T>(updaterOrValue: Updater<T>, previousValue: T): T {
  return typeof updaterOrValue === "function"
    ? (updaterOrValue as (old: T) => T)(previousValue)
    : updaterOrValue;
}

interface DataTableStoreState {
  tables: Record<string, TableItemState>;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  initFromCookies: (initialTables: Record<string, TableItemState>) => void;

  getTableState: (tableId: string) => TableItemState;
  setTableSearch: (tableId: string, search: string) => void;
  setTableFilter: (tableId: string, key: string, value: string) => void;
  setTableDateRange: (
    tableId: string,
    dateRange: { from?: string; to?: string } | undefined,
  ) => void;
  setTableSorting: (tableId: string, updaterOrValue: Updater<SortingState>) => void;
  removeTableSort: (tableId: string, columnId: string) => void;
  resetTableSorting: (tableId: string) => void;
  setTablePagination: (tableId: string, updaterOrValue: Updater<PaginationState>) => void;
  setTableColumnVisibility: (
    tableId: string,
    updaterOrValue: Updater<ColumnVisibilityState>,
  ) => void;
  resetTableFilters: (tableId: string) => void;
}

function getInitialClientTables(): Record<string, TableItemState> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TABLES_COOKIE_NAME}=([^;]*)`));
  if (!match?.[1]) return {};
  return parseTablesCookie(match[1]);
}

const initialClientTables = getInitialClientTables();

export const useDataTableStore = create<DataTableStoreState>()((set, get) => ({
  tables: initialClientTables,
  _hasHydrated: true,
  setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

  initFromCookies: (initialTables) =>
    set((state) => ({
      tables: {
        ...initialTables,
        ...state.tables,
      },
      _hasHydrated: true,
    })),

  getTableState: (tableId) => get().tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE,

  setTableSearch: (tableId, search) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          search,
          pagination: { ...prev.pagination, pageIndex: 0 },
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  setTableFilter: (tableId, key, value) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const updatedFilters = { ...prev.filters };
      if (value === "all" || !value) {
        delete updatedFilters[key];
      } else {
        updatedFilters[key] = value;
      }
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          filters: updatedFilters,
          pagination: { ...prev.pagination, pageIndex: 0 },
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  setTableDateRange: (tableId, dateRange) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          dateRange,
          pagination: { ...prev.pagination, pageIndex: 0 },
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  setTableSorting: (tableId, updaterOrValue) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          sorting: resolveUpdater(updaterOrValue, prev.sorting),
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  removeTableSort: (tableId, columnId) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const updated = prev.sorting.filter((s) => s.id !== columnId);
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          sorting: updated.length > 0 ? updated : [{ id: "id", desc: true }],
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  resetTableSorting: (tableId) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          sorting: [{ id: "id", desc: true }],
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  setTablePagination: (tableId, updaterOrValue) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          pagination: resolveUpdater(updaterOrValue, prev.pagination),
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  setTableColumnVisibility: (tableId, updaterOrValue) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          columnVisibility: resolveUpdater(updaterOrValue, prev.columnVisibility),
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),

  resetTableFilters: (tableId) =>
    set((state) => {
      const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
      const nextTables = {
        ...state.tables,
        [tableId]: {
          ...prev,
          search: "",
          filters: {},
          dateRange: undefined,
          pagination: { ...prev.pagination, pageIndex: 0 },
        },
      };
      writeTablesCookie(nextTables);
      return { tables: nextTables };
    }),
}));

export function useTableHydrated() {
  return useDataTableStore((state) => state._hasHydrated);
}
