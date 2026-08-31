"use client";

/**
 * @file components/projects/filters/weighments.tsx
 * @description Filter controls for the Weighments entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { WeighmentType, FieldType, ProjectSlug } from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";
import { IndianRupee } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";
import { getTypeIcon } from "@/lib/fields/helpers";
import {
  CenterFilter,
  CustomerFilter,
  UnitFilter,
  UserFilter,
  setTableColumnFilter,
} from "./common";

interface WeighmentsFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function WeighmentsFilters<TData extends RowData>({ table }: WeighmentsFiltersProps<TData>) {
  const rates = useEntitiesStore((state) => state.rates);

  const columnFilters = table.state.columnFilters;
  const currentType = columnFilters.find((f) => f.id === "type")?.value;
  const currentRateId = columnFilters.find((f) => f.id === "rate_id")?.value;

  const typeOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Types" },
      { value: WeighmentType.IN, label: "In" },
      { value: WeighmentType.OUT, label: "Out" },
      { value: WeighmentType.UNASSIGNED, label: "Unassigned" },
    ];
  }, []);

  const rateOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Rates" },
      ...rates.map((r) => ({
        value: String(r.id),
        label: r.label,
      })),
    ];
  }, [rates]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Type */}
      <BaseCombobox
        type={FieldType.TYPE}
        value={currentType ? String(currentType) : "all"}
        onChange={(val) => setTableColumnFilter(table, "type", val === "all" ? undefined : val)}
        data={typeOptions}
        placeholder="All Types"
        searchPlaceholder="Search type..."
        icon={getTypeIcon(currentType as string)}
        className="w-auto"
        id="filter-type-combobox"
      />

      {/* Unit */}
      <UnitFilter table={table} />

      {/* Rate */}
      <BaseCombobox
        type={ProjectSlug.RATES}
        value={currentRateId ? String(currentRateId) : "all"}
        onChange={(val) =>
          setTableColumnFilter(table, "rate_id", val === "all" ? undefined : Number(val))
        }
        data={rateOptions}
        placeholder="All Rates"
        searchPlaceholder="Search rate..."
        icon={IndianRupee}
        className="w-auto"
        id="filter-rate-combobox"
      />

      {/* Center */}
      <CenterFilter table={table} />

      {/* Operator / User */}
      <UserFilter table={table} />

      {/* Customer */}
      <CustomerFilter table={table} />
    </div>
  );
}
