"use client";

import type { SortingState, Updater } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import {
  DataTableCriteriaBar,
  DataTableFilterChip,
  DataTableDateRangeChip,
} from "@/components/data-table";
import { CpuIcon } from "@hugeicons/core-free-icons";
import type { EntriesFilterConfig } from "./entries-toolbar";

export interface EntriesCriteriaBarProps {
  hasActiveFilters: boolean;
  hasActiveSorts: boolean;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  onRemoveSort: (columnId: string) => void;
  columnLabels: Record<string, string>;
  columnIcons: Record<string, unknown>;
  onResetFilters: () => void;
  onResetSorts: () => void;
  onResetAll: () => void;
  filterConfigs: EntriesFilterConfig[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function EntriesCriteriaBar({
  hasActiveFilters,
  hasActiveSorts,
  sorting,
  onSortingChange,
  onRemoveSort,
  columnLabels,
  columnIcons,
  onResetFilters,
  onResetSorts,
  onResetAll,
  filterConfigs,
  filters,
  onFilterChange,
  dateRange,
  onDateRangeChange,
}: EntriesCriteriaBarProps) {
  return (
    <DataTableCriteriaBar
      hasActiveFilters={hasActiveFilters}
      hasActiveSorts={hasActiveSorts}
      sorting={sorting}
      onSortingChange={onSortingChange}
      onRemoveSort={onRemoveSort}
      columnLabels={columnLabels}
      columnIcons={columnIcons}
      onResetFilters={onResetFilters}
      onResetSorts={onResetSorts}
      onResetAll={onResetAll}
    >
      {/* Dynamic & Static Active Filter Chips via declarative loop */}
      {filterConfigs.map((config) => {
        const activeVal = filters[config.key] ?? "all";
        if (!activeVal || activeVal === "all") return null;

        const selectedOption = config.options.find((o) => o.value === activeVal);
        const label = selectedOption
          ? selectedOption.idPrefix
            ? `${selectedOption.idPrefix} ${selectedOption.label}`
            : selectedOption.label
          : `${config.title} #${activeVal}`;

        let chipVariant = config.variant;
        if (config.key === "created_by" && selectedOption?.icon === CpuIcon) {
          chipVariant = "orange";
        } else if (config.key === "source" && activeVal === "hardware") {
          chipVariant = "orange";
        }

        return (
          <DataTableFilterChip
            key={config.key}
            label={config.title}
            value={label}
            categoryIcon={config.categoryIcon}
            valueIcon={selectedOption?.icon}
            variant={chipVariant}
            onRemove={() => onFilterChange(config.key, "all")}
          />
        );
      })}

      {/* Active Date Range Chip (Golden Honey Amber) */}
      <DataTableDateRangeChip dateRange={dateRange} onRemove={() => onDateRangeChange(undefined)} />
    </DataTableCriteriaBar>
  );
}
