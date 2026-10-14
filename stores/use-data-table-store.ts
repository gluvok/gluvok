import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ColumnVisibilityState,
  SortingState,
  PaginationState,
  Updater,
} from "@tanstack/react-table";

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
  pagination: { pageIndex: 0, pageSize: 10 },
  columnVisibility: {},
};

function resolveUpdater<T>(updaterOrValue: Updater<T>, previousValue: T): T {
  return typeof updaterOrValue === "function"
    ? (updaterOrValue as (old: T) => T)(previousValue)
    : updaterOrValue;
}

interface DataTableStoreState {
  tables: Record<string, TableItemState>;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

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

export const useDataTableStore = create<DataTableStoreState>()(
  persist(
    (set, get) => ({
      tables: {},
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      getTableState: (tableId) => get().tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE,

      setTableSearch: (tableId, search) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                search,
                pagination: { ...prev.pagination, pageIndex: 0 },
              },
            },
          };
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
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                filters: updatedFilters,
                pagination: { ...prev.pagination, pageIndex: 0 },
              },
            },
          };
        }),

      setTableDateRange: (tableId, dateRange) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                dateRange,
                pagination: { ...prev.pagination, pageIndex: 0 },
              },
            },
          };
        }),

      setTableSorting: (tableId, updaterOrValue) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                sorting: resolveUpdater(updaterOrValue, prev.sorting),
              },
            },
          };
        }),

      removeTableSort: (tableId, columnId) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          const updated = prev.sorting.filter((s) => s.id !== columnId);
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                sorting: updated.length > 0 ? updated : [{ id: "id", desc: true }],
              },
            },
          };
        }),

      resetTableSorting: (tableId) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                sorting: [{ id: "id", desc: true }],
              },
            },
          };
        }),

      setTablePagination: (tableId, updaterOrValue) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                pagination: resolveUpdater(updaterOrValue, prev.pagination),
              },
            },
          };
        }),

      setTableColumnVisibility: (tableId, updaterOrValue) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                columnVisibility: resolveUpdater(updaterOrValue, prev.columnVisibility),
              },
            },
          };
        }),

      resetTableFilters: (tableId) =>
        set((state) => {
          const prev = state.tables[tableId] ?? DEFAULT_TABLE_ITEM_STATE;
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...prev,
                search: "",
                filters: {},
                dateRange: undefined,
                pagination: { ...prev.pagination, pageIndex: 0 },
              },
            },
          };
        }),
    }),
    {
      name: "gluvok-tables-state",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function useTableHydrated() {
  const storeHydrated = useDataTableStore((state) => state._hasHydrated);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useDataTableStore.persist.hasHydrated() || useDataTableStore.getState()._hasHydrated) {
      setHydrated(true);
      return;
    }

    const unsub = useDataTableStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    setHydrated(true);

    return () => {
      unsub();
    };
  }, []);

  return storeHydrated || hydrated;
}
