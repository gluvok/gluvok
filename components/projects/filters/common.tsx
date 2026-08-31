"use client";

/**
 * @file components/projects/filters/common.tsx
 * @description Shared filter helpers and reusable filter combobox components (Centers, Users, Customers, Units).
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Unit, FieldType, ProjectSlug } from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";
import { Building, Ruler, UserCog, Users } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";

export interface FilterComponentProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function setTableColumnFilter<TData extends RowData>(
  table: ReactTable<ProjectTableFeatures, TData>,
  id: string,
  value: unknown,
) {
  table.setColumnFilters((prev) => {
    const filtered = prev.filter((f) => f.id !== id);
    if (value !== undefined && value !== null && value !== "") {
      return [...filtered, { id, value }];
    }
    return filtered;
  });
}

export function CenterFilter<TData extends RowData>({ table }: FilterComponentProps<TData>) {
  const centers = useEntitiesStore((state) => state.centers);
  const currentCenterId = table.state.columnFilters.find((f) => f.id === "center_id")?.value;

  const centerOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Centers" },
      ...centers.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [centers]);

  return (
    <BaseCombobox
      type={ProjectSlug.CENTERS}
      value={currentCenterId ? String(currentCenterId) : "all"}
      onChange={(val) =>
        setTableColumnFilter(table, "center_id", val === "all" ? undefined : Number(val))
      }
      data={centerOptions}
      placeholder="All Centers"
      searchPlaceholder="Search center..."
      icon={Building}
      className="w-auto"
      id="filter-center-combobox"
    />
  );
}

export function UserFilter<TData extends RowData>({ table }: FilterComponentProps<TData>) {
  const users = useEntitiesStore((state) => state.users);
  const currentUserId = table.state.columnFilters.find((f) => f.id === "user_id")?.value;

  const userOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Users" },
      ...users.map((u) => ({
        value: String(u.id),
        label: u.name,
      })),
    ];
  }, [users]);

  return (
    <BaseCombobox
      type={ProjectSlug.USERS}
      value={currentUserId ? String(currentUserId) : "all"}
      onChange={(val) =>
        setTableColumnFilter(table, "user_id", val === "all" ? undefined : Number(val))
      }
      data={userOptions}
      placeholder="All Users"
      searchPlaceholder="Search user..."
      icon={UserCog}
      className="w-auto"
      id="filter-user-combobox"
    />
  );
}

export function CustomerFilter<TData extends RowData>({ table }: FilterComponentProps<TData>) {
  const customers = useEntitiesStore((state) => state.customers);
  const currentCustomerId = table.state.columnFilters.find((f) => f.id === "customer_id")?.value;

  const customerOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Customers" },
      ...customers.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    ];
  }, [customers]);

  return (
    <BaseCombobox
      type={ProjectSlug.CUSTOMERS}
      value={currentCustomerId ? String(currentCustomerId) : "all"}
      onChange={(val) =>
        setTableColumnFilter(table, "customer_id", val === "all" ? undefined : Number(val))
      }
      data={customerOptions}
      placeholder="All Customers"
      searchPlaceholder="Search customer..."
      icon={Users}
      className="w-auto"
      id="filter-customer-combobox"
    />
  );
}

export function UnitFilter<TData extends RowData>({ table }: FilterComponentProps<TData>) {
  const currentUnit = table.state.columnFilters.find((f) => f.id === "unit")?.value;

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
    <BaseCombobox
      type={FieldType.UNIT}
      value={currentUnit ? String(currentUnit) : "all"}
      onChange={(val) => setTableColumnFilter(table, "unit", val === "all" ? undefined : val)}
      data={unitOptions}
      placeholder="All Units"
      searchPlaceholder="Search unit..."
      icon={Ruler}
      className="w-auto"
      id="filter-unit-combobox"
    />
  );
}
