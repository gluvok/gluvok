"use client";

/**
 * @file components/projects/filters/rates.tsx
 * @description Filter controls for the Rates entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Unit, FieldType, ProjectSlug } from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";
import { Package, Ruler } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";
import { DateRangeFilter } from "./date-range-filter";

interface RatesFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function RatesFilters<TData extends RowData>({ table }: RatesFiltersProps<TData>) {
  const commodities = useEntitiesStore((state) => state.commodities);

  const columnFilters = table.state.columnFilters;
  const currentCommodityId = columnFilters.find((f) => f.id === "commodity_id")?.value;
  const currentUnit = columnFilters.find((f) => f.id === "unit")?.value;

  const setColumnFilter = (id: string, value: unknown) => {
    table.setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (value !== undefined && value !== null && value !== "") {
        return [...filtered, { id, value }];
      }
      return filtered;
    });
  };

  const commodityOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Commodities" },
      ...commodities.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [commodities]);

  const unitOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Units" },
      ...Object.values(Unit).map((u) => ({
        value: u,
        label: u,
      })),
    ];
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range */}
      <DateRangeFilter table={table} />

      {/* Commodity */}
      <BaseCombobox
        type={ProjectSlug.COMMODITIES}
        value={currentCommodityId ? String(currentCommodityId) : "all"}
        onChange={(val) => setColumnFilter("commodity_id", val === "all" ? undefined : Number(val))}
        data={commodityOptions}
        placeholder="All Commodities"
        searchPlaceholder="Search commodity..."
        icon={Package}
        className="w-auto"
        id="filter-commodity-combobox"
      />

      {/* Unit */}
      <BaseCombobox
        type={FieldType.UNIT}
        value={currentUnit ? String(currentUnit) : "all"}
        onChange={(val) => setColumnFilter("unit", val === "all" ? undefined : val)}
        data={unitOptions}
        placeholder="All Units"
        searchPlaceholder="Search unit..."
        icon={Ruler}
        className="w-auto"
        id="filter-unit-combobox"
      />
    </div>
  );
}
