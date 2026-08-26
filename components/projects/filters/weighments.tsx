"use client"

/**
 * @file components/projects/filters/weighments.tsx
 * @description Filter controls for the Weighments entity table.
 */

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { EntityKey, Unit, WeighmentType, FilterValue, FieldType, ProjectSlug } from "@/lib/constants/enums"
import { useEntitiesStore } from "@/lib/store"
import { IndianRupee, Ruler } from "lucide-react"
import { BaseCombobox } from "@/components/combobox/base"
import { getTypeIcon } from "@/lib/fields/helpers"
import { DateRangeFilter } from "./date-range-filter"

interface WeighmentsFiltersProps<TData> {
  table: Table<TData>
}

function useWeighmentsFilterData() {
  const weighmentFiltersData = useEntitiesStore((state) => state.weighmentFiltersData)

  return {
    centers: weighmentFiltersData?.centers || [],
    profiles: weighmentFiltersData?.profiles || [],
    customers: weighmentFiltersData?.customers || [],
    rates: weighmentFiltersData?.rates || [],
  }
}

export function WeighmentsFilters<TData>({ table }: WeighmentsFiltersProps<TData>) {
  const { rates } = useWeighmentsFilterData()

  const columnFilters = table.getState().columnFilters
  const currentType = columnFilters.find((f) => f.id === EntityKey.TYPE)?.value
  const currentUnit = columnFilters.find((f) => f.id === EntityKey.UNIT)?.value
  const currentRateId = columnFilters.find((f) => f.id === EntityKey.RATE_ID)?.value

  const setColumnFilter = (id: string, value: unknown) => {
    table.setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== id)
      if (value !== undefined && value !== null && value !== "") {
        return [...filtered, { id, value }]
      }
      return filtered
    })
  }

  const typeOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Types" },
      { value: WeighmentType.IN, label: "In" },
      { value: WeighmentType.OUT, label: "Out" },
      { value: WeighmentType.UNASSIGNED, label: "Unassigned" },
    ]
  }, [])

  const unitOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Units" },
      ...Object.values(Unit).map((u) => ({
        value: u,
        label: u,
      })),
    ]
  }, [])

  const rateOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Rates" },
      ...rates.map((r) => ({
        value: String(r.id),
        label: r.label,
      })),
    ]
  }, [rates])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range */}
      <DateRangeFilter table={table} />

      {/* Type */}
      <BaseCombobox
        type={FieldType.TYPE}
        value={currentType ? String(currentType) : FilterValue.ALL}
        onChange={(val) => setColumnFilter(EntityKey.TYPE, val === FilterValue.ALL ? undefined : val)}
        data={typeOptions}
        placeholder="All Types"
        searchPlaceholder="Search type..."
        icon={getTypeIcon(currentType as string)}
        className="w-auto"
        id="filter-type-combobox"
      />

      {/* Unit */}
      <BaseCombobox
        type={FieldType.UNIT}
        value={currentUnit ? String(currentUnit) : FilterValue.ALL}
        onChange={(val) => setColumnFilter(EntityKey.UNIT, val === FilterValue.ALL ? undefined : val)}
        data={unitOptions}
        placeholder="All Units"
        searchPlaceholder="Search unit..."
        icon={Ruler}
        className="w-auto"
        id="filter-unit-combobox"
      />

      {/* Rate */}
      <BaseCombobox
        type={ProjectSlug.RATES}
        value={currentRateId ? String(currentRateId) : FilterValue.ALL}
        onChange={(val) => setColumnFilter(EntityKey.RATE_ID, val === FilterValue.ALL ? undefined : Number(val))}
        data={rateOptions}
        placeholder="All Rates"
        searchPlaceholder="Search rate..."
        icon={IndianRupee}
        className="w-auto"
        id="filter-rate-combobox"
      />
    </div>
  )
}
