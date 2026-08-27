"use client";

/**
 * @file components/projects/filters/weighments.tsx
 * @description Filter controls for the Weighments entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  EntityKey,
  Unit,
  WeighmentType,
  FilterValue,
  FieldType,
  ProjectSlug,
} from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";
import { Building, IndianRupee, Ruler, User as UserIcon, Users } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";
import { getTypeIcon } from "@/lib/fields/helpers";
import { DateRangeFilter } from "./date-range-filter";

interface WeighmentsFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

function useWeighmentsFilterData() {
  const weighmentFiltersData = useEntitiesStore((state) => state.weighmentFiltersData);

  return {
    centers: weighmentFiltersData?.centers || [],
    users: weighmentFiltersData?.users || [],
    customers: weighmentFiltersData?.customers || [],
    rates: weighmentFiltersData?.rates || [],
  };
}

export function WeighmentsFilters<TData extends RowData>({ table }: WeighmentsFiltersProps<TData>) {
  const { centers, users, customers, rates } = useWeighmentsFilterData();

  const columnFilters = table.state.columnFilters;
  const currentType = columnFilters.find((f) => f.id === EntityKey.TYPE)?.value;
  const currentUnit = columnFilters.find((f) => f.id === EntityKey.UNIT)?.value;
  const currentRateId = columnFilters.find((f) => f.id === EntityKey.RATE_ID)?.value;
  const currentCenterId = columnFilters.find((f) => f.id === EntityKey.CENTER_ID)?.value;
  const currentUserId = columnFilters.find((f) => f.id === EntityKey.USER_ID)?.value;
  const currentCustomerId = columnFilters.find((f) => f.id === EntityKey.CUSTOMER_ID)?.value;

  const setColumnFilter = (id: string, value: unknown) => {
    table.setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (value !== undefined && value !== null && value !== "") {
        return [...filtered, { id, value }];
      }
      return filtered;
    });
  };

  const typeOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Types" },
      { value: WeighmentType.IN, label: "In" },
      { value: WeighmentType.OUT, label: "Out" },
      { value: WeighmentType.UNASSIGNED, label: "Unassigned" },
    ];
  }, []);

  const unitOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Units" },
      ...Object.values(Unit).map((u) => ({
        value: u,
        label: u,
      })),
    ];
  }, []);

  const rateOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Rates" },
      ...rates.map((r) => ({
        value: String(r.id),
        label: r.label,
      })),
    ];
  }, [rates]);

  const centerOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Centers" },
      ...centers.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [centers]);

  const userOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Operators" },
      ...users.map((u) => ({
        value: String(u.id),
        label: u.name,
      })),
    ];
  }, [users]);

  const customerOptions = React.useMemo(() => {
    return [
      { value: FilterValue.ALL, label: "All Customers" },
      ...customers.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [customers]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range */}
      <DateRangeFilter table={table} />

      {/* Type */}
      <BaseCombobox
        type={FieldType.TYPE}
        value={currentType ? String(currentType) : FilterValue.ALL}
        onChange={(val) =>
          setColumnFilter(EntityKey.TYPE, val === FilterValue.ALL ? undefined : val)
        }
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
        onChange={(val) =>
          setColumnFilter(EntityKey.UNIT, val === FilterValue.ALL ? undefined : val)
        }
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
        onChange={(val) =>
          setColumnFilter(EntityKey.RATE_ID, val === FilterValue.ALL ? undefined : Number(val))
        }
        data={rateOptions}
        placeholder="All Rates"
        searchPlaceholder="Search rate..."
        icon={IndianRupee}
        className="w-auto"
        id="filter-rate-combobox"
      />

      {/* Center */}
      <BaseCombobox
        type={ProjectSlug.CENTERS}
        value={currentCenterId ? String(currentCenterId) : FilterValue.ALL}
        onChange={(val) =>
          setColumnFilter(EntityKey.CENTER_ID, val === FilterValue.ALL ? undefined : Number(val))
        }
        data={centerOptions}
        placeholder="All Centers"
        searchPlaceholder="Search center..."
        icon={Building}
        className="w-auto"
        id="filter-center-combobox"
      />

      {/* Operator / User */}
      <BaseCombobox
        type={ProjectSlug.USERS}
        value={currentUserId ? String(currentUserId) : FilterValue.ALL}
        onChange={(val) =>
          setColumnFilter(EntityKey.USER_ID, val === FilterValue.ALL ? undefined : Number(val))
        }
        data={userOptions}
        placeholder="All Operators"
        searchPlaceholder="Search operator..."
        icon={UserIcon}
        className="w-auto"
        id="filter-user-combobox"
      />

      {/* Customer */}
      <BaseCombobox
        type={ProjectSlug.CUSTOMERS}
        value={currentCustomerId ? String(currentCustomerId) : FilterValue.ALL}
        onChange={(val) =>
          setColumnFilter(EntityKey.CUSTOMER_ID, val === FilterValue.ALL ? undefined : Number(val))
        }
        data={customerOptions}
        placeholder="All Customers"
        searchPlaceholder="Search customer..."
        icon={Users}
        className="w-auto"
        id="filter-customer-combobox"
      />
    </div>
  );
}
