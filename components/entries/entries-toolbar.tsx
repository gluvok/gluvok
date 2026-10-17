"use client";

import type { ReactTable, RowData } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import {
  DataTableSearchInput,
  DataTableFacetedFilter,
  type FacetedFilterOption,
  DataTableViewOptions,
  DatePickerWithRange,
  type DataTableFeatures,
} from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { CpuIcon, UserIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { EntryMode } from "@/app/entries/types";

export interface EntriesFilterConfig {
  key: string;
  title: string;
  options: FacetedFilterOption[];
  variant: "stone" | "emerald" | "orange" | "primary";
  categoryIcon?: unknown;
}

export interface EntriesToolbarProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  search: string;
  onSearchChange: (value: string) => void;
  mode: EntryMode;
  onModeChange: (mode: EntryMode) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  filterConfigs: EntriesFilterConfig[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
}

export function EntriesToolbar<TData extends RowData>({
  table,
  search,
  onSearchChange,
  mode,
  onModeChange,
  dateRange,
  onDateRangeChange,
  filterConfigs,
  filters,
  onFilterChange,
}: EntriesToolbarProps<TData>) {
  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Row 1: Search Box & Automatic/Manual Segmented Pill Toggle (Left) + Date Range Picker & Columns (Right) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <DataTableSearchInput
            placeholder="Search entries..."
            value={search}
            onChange={onSearchChange}
          />
          <div
            role="radiogroup"
            aria-label="Entry mode"
            className="inline-flex h-8 items-center rounded-md border border-border bg-muted/40 p-0.5 text-muted-foreground shrink-0"
          >
            <Button
              type="button"
              role="radio"
              aria-checked={mode === "automatic"}
              variant="ghost"
              size="sm"
              onClick={() => onModeChange("automatic")}
              className={cn(
                "h-7 gap-1 rounded-sm px-2 text-2xs sm:gap-1.5 sm:px-2.5 sm:text-xs font-medium transition-all cursor-pointer",
                mode === "automatic"
                  ? "bg-background text-foreground shadow-xs border border-border/50 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent",
              )}
            >
              <HugeiconsIcon
                icon={CpuIcon}
                className="size-3 text-orange-600 dark:text-orange-400 sm:size-3.5"
              />
              <span className="sm:hidden">Auto</span>
              <span className="hidden sm:inline">Automatic</span>
            </Button>
            <Button
              type="button"
              role="radio"
              aria-checked={mode === "manual"}
              variant="ghost"
              size="sm"
              onClick={() => onModeChange("manual")}
              className={cn(
                "h-7 gap-1 rounded-sm px-2 text-2xs sm:gap-1.5 sm:px-2.5 sm:text-xs font-medium transition-all cursor-pointer",
                mode === "manual"
                  ? "bg-background text-foreground shadow-xs border border-border/50 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent",
              )}
            >
              <HugeiconsIcon
                icon={UserIcon}
                className="size-3 text-stone-600 dark:text-stone-400 sm:size-3.5"
              />
              <span>Manual</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={onDateRangeChange}
            className="flex-1 sm:flex-initial"
          />
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Row 2: Filter Comboboxes via declarative loop */}
      <div className="flex flex-wrap items-center gap-2">
        {filterConfigs.map((config) => (
          <DataTableFacetedFilter
            key={config.key}
            title={config.title}
            options={config.options}
            value={filters[config.key] ?? "all"}
            onValueChange={(val: string) => onFilterChange(config.key, val)}
          />
        ))}
      </div>
    </div>
  );
}
