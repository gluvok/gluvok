"use client";

/**
 * @file components/projects/filters/rates.tsx
 * @description Filter controls for the Rates entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { ProjectSlug } from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";
import { Package } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";
import { UnitFilter, setTableColumnFilter } from "./common";

interface RatesFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function RatesFilters<TData extends RowData>({ table }: RatesFiltersProps<TData>) {
  const commodities = useEntitiesStore((state) => state.commodities);

  const columnFilters = table.state.columnFilters;
  const currentCommodityId = columnFilters.find((f) => f.id === "commodity_id")?.value;

  const commodityOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Commodities" },
      ...commodities.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [commodities]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Commodity */}
      <BaseCombobox
        type={ProjectSlug.COMMODITIES}
        value={currentCommodityId ? String(currentCommodityId) : "all"}
        onChange={(val) =>
          setTableColumnFilter(table, "commodity_id", val === "all" ? undefined : Number(val))
        }
        data={commodityOptions}
        placeholder="All Commodities"
        searchPlaceholder="Search commodity..."
        icon={Package}
        className="w-auto"
        id="filter-commodity-combobox"
      />

      {/* Unit */}
      <UnitFilter table={table} />
    </div>
  );
}
