"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DatePickerWithRange } from "@/components/data-table/date-range-picker";
import { SortableSortChip, SortChipOverlay } from "@/components/data-table/sortable-sort-chip";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { columns } from "./columns";
import { features } from "@/components/data-table/data-table-features";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DEFAULT_TABLE_ITEM_STATE,
  useDataTableStore,
  useTableHydrated,
} from "@/stores/use-data-table-store";
import { type Center } from "./types";

interface AutoApproveOption {
  label: string;
  value: string;
}

const AUTO_APPROVE_OPTIONS: AutoApproveOption[] = [
  { label: "All Auto Approve", value: "all" },
  { label: "Enabled", value: "true" },
  { label: "Disabled", value: "false" },
];

interface CentersApiResponse {
  data: Center[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TABLE_ID = "centers";

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  name: "Name",
  auto_approve: "Auto Approve",
  created_at: "Created At",
  updated_at: "Updated At",
};

export function CentersDataTable() {
  const hasHydrated = useTableHydrated();
  const store = useDataTableStore();
  const tableState = store.tables[TABLE_ID] ?? DEFAULT_TABLE_ITEM_STATE;

  const [data, setData] = useState<Center[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read persisted state for 'centers' table from store
  const search = tableState.search;
  const autoApproveFilter = tableState.filters["auto_approve"] ?? "all";
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (!tableState.dateRange?.from) return undefined;
    return {
      from: new Date(tableState.dateRange.from),
      to: tableState.dateRange.to ? new Date(tableState.dateRange.to) : undefined,
    };
  }, [tableState.dateRange]);
  const sorting = tableState.sorting;
  const pagination = tableState.pagination;
  const columnVisibility = tableState.columnVisibility;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const debouncedSearch = useDebounce(search, 300);

  // Actions updating persisted store
  const setSearch = (val: string) => store.setTableSearch(TABLE_ID, val);
  const setAutoApproveFilter = (val: string) => store.setTableFilter(TABLE_ID, "auto_approve", val);
  const setDateRange = (range: DateRange | undefined) =>
    store.setTableDateRange(
      TABLE_ID,
      range ? { from: range.from?.toISOString(), to: range.to?.toISOString() } : undefined,
    );
  const setSorting = (updater: Updater<SortingState>) => store.setTableSorting(TABLE_ID, updater);
  const removeSort = (columnId: string) => store.removeTableSort(TABLE_ID, columnId);
  const resetSorting = () => store.resetTableSorting(TABLE_ID);
  const setPagination = (updater: Updater<PaginationState>) =>
    store.setTablePagination(TABLE_ID, updater);
  const setColumnVisibility = (updater: Updater<ColumnVisibilityState>) =>
    store.setTableColumnVisibility(TABLE_ID, updater);
  const resetAllFilters = () => store.resetTableFilters(TABLE_ID);
  const resetAllCriteria = () => {
    resetAllFilters();
    resetSorting();
  };

  // Drag and drop state and sensors for multi-column sort priority reordering
  const [activeSortId, setActiveSortId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveSortId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveSortId(null);

      if (!over || active.id === over.id) return;

      setSorting((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    [setSorting, setPagination],
  );

  const handleDragCancel = useCallback(() => {
    setActiveSortId(null);
  }, []);

  const activeSortRule = useMemo(() => {
    if (!activeSortId) return null;
    return sorting.find((s) => s.id === activeSortId) ?? null;
  }, [activeSortId, sorting]);

  const activeSortIndex = useMemo(() => {
    if (!activeSortId) return -1;
    return sorting.findIndex((s) => s.id === activeSortId);
  }, [activeSortId, sorting]);

  // Fetch centers via axios with strict multi-column sorting and filtering
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<CentersApiResponse>("/api/centers", {
        params: {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          ...(sorting.length > 0 && {
            sort: sorting.map((s) => `${s.id}.${s.desc ? "desc" : "asc"}`).join(","),
          }),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(autoApproveFilter !== "all" && { auto_approve: autoApproveFilter }),
          ...(dateRange?.from && { from: dateRange.from.toISOString() }),
          ...(dateRange?.to && { to: dateRange.to.toISOString() }),
        },
      });

      setData(response.data.data ?? []);
      setTotalCount(response.data.totalCount ?? 0);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    debouncedSearch,
    autoApproveFilter,
    dateRange,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;
    fetchCenters();
  }, [hasHydrated, fetchCenters]);

  const table = useTable({
    features,
    data,
    columns,
    manualPagination: true,
    rowCount: totalCount,
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const isDefaultSort = sorting.length === 1 && sorting[0].id === "id" && sorting[0].desc === true;
  const hasActiveSorts = !isDefaultSort && sorting.length > 0;
  const hasActiveFilters = Boolean(autoApproveFilter !== "all" || dateRange?.from);
  const hasActiveCriteria = hasActiveFilters || hasActiveSorts;

  const selectedAutoApproveOption =
    AUTO_APPROVE_OPTIONS.find((opt) => opt.value === autoApproveFilter) ?? AUTO_APPROVE_OPTIONS[0];

  // Hydration guard: show clean centered spinner until localStorage is hydrated, preventing layout shift!
  if (!hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-border bg-card">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Spinner className="size-6 text-muted-foreground" />
          <span className="text-xs">Loading table preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Primary Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters Group (Left) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          {/* Search Input with Clear (Cross) Button */}
          <div className="relative w-full sm:w-60">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search centers by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full pl-8 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Clear search"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            )}
          </div>

          {/* Auto Approve Filter Combobox */}
          <div className="w-full sm:w-48">
            <Combobox
              items={AUTO_APPROVE_OPTIONS}
              value={selectedAutoApproveOption}
              onValueChange={(val: AutoApproveOption | null) => {
                setAutoApproveFilter(val ? val.value : "all");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              itemToStringValue={(item: AutoApproveOption) => item.label}
            >
              <ComboboxInput
                placeholder="Auto Approve filter"
                className="h-8 w-full text-xs"
                showClear={autoApproveFilter !== "all"}
              />
              <ComboboxContent>
                <ComboboxEmpty>No options found.</ComboboxEmpty>
                <ComboboxList>
                  {AUTO_APPROVE_OPTIONS.map((item) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>

        {/* Action Controls Group (Right) - Date Range & Columns side-by-side */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Date Range Picker for created_at */}
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => {
              setDateRange(range);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="flex-1 sm:flex-initial"
          />

          {/* Column Visibility Options */}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Active Criteria Bar (Badges) - Compact unified filters and sorts */}
      {hasActiveCriteria && (
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-md bg-muted/30 px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
          {hasActiveFilters && (
            <>
              <span className="shrink-0 text-2xs font-medium text-muted-foreground">Filters:</span>

              {/* Auto Approve Chip */}
              {autoApproveFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 py-0.5 pl-2 pr-1 text-2xs font-normal"
                >
                  <span className="text-muted-foreground">Auto Approve:</span>
                  <span className="font-medium">
                    {autoApproveFilter === "true" ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoApproveFilter("all");
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    }}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                    aria-label="Remove auto approve filter"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                </Badge>
              )}

              {/* Date Range Chip */}
              {dateRange?.from && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 py-0.5 pl-2 pr-1 text-2xs font-normal"
                >
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {dateRange.to
                      ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                      : format(dateRange.from, "LLL dd, y")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange(undefined);
                      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    }}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                    aria-label="Remove date range filter"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                </Badge>
              )}
            </>
          )}

          {hasActiveFilters && hasActiveSorts && (
            <span className="mx-0.5 h-3 w-px shrink-0 bg-border/80" aria-hidden="true" />
          )}

          {hasActiveSorts && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <span className="shrink-0 text-2xs font-medium text-muted-foreground">Sorts:</span>
              <SortableContext
                items={sorting.map((s) => s.id)}
                strategy={horizontalListSortingStrategy}
              >
                {sorting.map((sortRule, index) => {
                  const colTitle = COLUMN_LABELS[sortRule.id] ?? sortRule.id;
                  return (
                    <SortableSortChip
                      key={sortRule.id}
                      sortRule={sortRule}
                      index={index}
                      colTitle={colTitle}
                      isDraggable={sorting.length > 1}
                      onRemove={(columnId) => {
                        removeSort(columnId);
                        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                      }}
                    />
                  );
                })}
              </SortableContext>

              <DragOverlay>
                {activeSortRule && activeSortIndex !== -1 ? (
                  <SortChipOverlay
                    sortRule={activeSortRule}
                    index={activeSortIndex}
                    colTitle={COLUMN_LABELS[activeSortRule.id] ?? activeSortRule.id}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {/* Clear Actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAllCriteria}
            className="shrink-0 ml-auto h-5 px-1.5 text-2xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Compact Clean Table Container with Scoped Loading State */}
      <div className="overflow-hidden rounded-md border border-border bg-card">
        {error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2 text-destructive">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
              <span className="text-xs">{error}</span>
              <Button variant="outline" size="sm" onClick={() => fetchCenters()} className="mt-1">
                Try again
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Spinner className="size-6 text-muted-foreground" />
              <span className="text-xs">Loading centers...</span>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-8 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-8 px-3 text-xs font-semibold">
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="h-8 hover:bg-muted/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-3 py-1 text-xs">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-20 text-center text-xs text-muted-foreground"
                  >
                    No centers found matching the specified filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Controls */}
      <DataTablePagination table={table} />
    </div>
  );
}
