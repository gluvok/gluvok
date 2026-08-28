"use client";

/**
 * @file components/projects/filters/users.tsx
 * @description Filter controls for the Users entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Role, FieldType } from "@/lib/constants/enums";
import { Shield } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";

interface UsersFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: Role.ADMIN, label: Role.ADMIN },
  { value: Role.MANAGER, label: Role.MANAGER },
  { value: Role.OPERATOR, label: Role.OPERATOR },
  { value: Role.BASE, label: Role.BASE },
];

export function UsersFilters<TData extends RowData>({ table }: UsersFiltersProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentRole = columnFilters.find((f) => f.id === "role")?.value as string | undefined;

  const setColumnFilter = (id: string, value: unknown) => {
    table.setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (value !== undefined && value !== null && value !== "") {
        return [...filtered, { id, value }];
      }
      return filtered;
    });
  };

  const roleOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Roles" },
      ...ROLE_OPTIONS.map((r) => ({
        value: r.value,
        label: r.label,
      })),
    ];
  }, []);

  return (
    <div className="flex items-center gap-2">
      <BaseCombobox
        type={FieldType.ROLE}
        value={currentRole ?? "all"}
        onChange={(val) => setColumnFilter("role", val === "all" ? undefined : val)}
        data={roleOptions}
        placeholder="All Roles"
        searchPlaceholder="Search role..."
        icon={Shield}
        className="w-auto"
        id="filter-role-combobox"
      />
    </div>
  );
}
