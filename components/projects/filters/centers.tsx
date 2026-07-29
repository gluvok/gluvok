"use client"

/**
 * @file components/projects/filters/centers.tsx
 * @description Filter controls for the Centers entity table.
 */

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { EntityKey, ProjectSlug } from "@/lib/constants/enums"
import { useEntitiesStore, useAuthStore, isFilterVisible } from "@/lib/store"
import { Factory } from "lucide-react"
import { BaseCombobox } from "@/components/combobox/base"

interface CentersFiltersProps<TData> {
  table: Table<TData>
}

export function CentersFilters<TData>({ table }: CentersFiltersProps<TData>) {
  const user = useAuthStore((state) => state.user)
  const factories = useEntitiesStore((state) => state.factories)

  const factoryOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Factories" },
      ...factories.map((f) => ({
        value: String(f.id),
        label: `${f.name} (ID: ${f.id})`,
      })),
    ]
  }, [factories])

  if (!isFilterVisible(user?.role, ProjectSlug.CENTERS, EntityKey.FACTORY_ID)) {
    return null
  }

  const columnFilters = table.getState().columnFilters
  const currentFactoryId = columnFilters.find((f) => f.id === EntityKey.FACTORY_ID)?.value

  const setColumnFilter = (id: string, value: unknown) => {
    table.setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== id)
      if (value !== undefined && value !== null && value !== "") {
        return [...filtered, { id, value }]
      }
      return filtered
    })
  }

  return (
    <div className="flex items-center gap-2">
      <BaseCombobox
        type="factory"
        value={currentFactoryId ? String(currentFactoryId) : "all"}
        onChange={(val) => setColumnFilter(EntityKey.FACTORY_ID, val === "all" ? undefined : Number(val))}
        data={factoryOptions}
        placeholder="All Factories"
        searchPlaceholder="Search factory..."
        icon={Factory}
        className="w-auto"
        id="filter-factory-combobox"
      />
    </div>
  )
}
