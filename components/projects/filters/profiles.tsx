"use client";

/**
 * @file components/projects/filters/profiles.tsx
 * @description Filter controls for the Profiles entity table.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Role, EntityKey, FilterValue, FieldType } from "@/lib/constants/enums";
import { Shield } from "lucide-react";
import { BaseCombobox } from "@/components/combobox/base";

interface ProfilesFiltersProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: Role.ADMIN, label: Role.ADMIN },
  { value: Role.MANAGER, label: Role.MANAGER },
  { value: Role.OPERATOR, label: Role.OPERATOR },
  { value: Role.BASE, label: Role.BASE },
];

export function ProfilesFilters<TData extends RowData>({ table }: ProfilesFiltersProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentRole = columnFilters.find((f) => f.id === EntityKey.ROLE)?.value as
    | string
    | undefined;

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
      { value: FilterValue.ALL, label: "All Roles" },
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
        value={currentRole ?? FilterValue.ALL}
        onChange={(val) =>
          setColumnFilter(EntityKey.ROLE, val === FilterValue.ALL ? undefined : val)
        }
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
