/**
 * @file components/projects/columns/index.tsx
 * @description Column definitions and rendering helpers for the Index entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { type EntityRecord } from "@/types";
import { ProjectSlug } from "@/lib/constants/enums";
import { useAuthStore, isColumnVisible, type Permission } from "@/lib/store";

import { getSelectColumn } from "./select";
import { getSystemColumns } from "./system";
import { getActionsColumn } from "./actions";

import { getCentersColumns } from "./centers";
import { getCommoditiesColumns } from "./commodities";
import { getRatesColumns } from "./rates";
import { getCustomersColumns } from "./customers";
import { getEntriesColumns } from "./entries";
import { getWeighmentsColumns } from "./weighments";
import { getUsersColumns } from "./users";
import { getSettingsColumns } from "./settings";

export interface ColumnActionsCallbacks<T = EntityRecord> {
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}

function getSpecificColumns<T extends RowData>(
  projectSlug: string,
): ColumnDef<ProjectTableFeatures, T>[] {
  switch (projectSlug) {
    case ProjectSlug.CENTERS:
      return getCentersColumns<T>();
    case ProjectSlug.COMMODITIES:
      return getCommoditiesColumns<T>();
    case ProjectSlug.RATES:
      return getRatesColumns<T>();
    case ProjectSlug.CUSTOMERS:
      return getCustomersColumns<T>();
    case ProjectSlug.ENTRIES:
      return getEntriesColumns<T>();
    case ProjectSlug.WEIGHMENTS:
      return getWeighmentsColumns<T>();
    case ProjectSlug.USERS:
      return getUsersColumns<T>();
    case ProjectSlug.SETTINGS:
      return getSettingsColumns<T>();

    default:
      return [];
  }
}

export function getProjectColumns<T extends EntityRecord = EntityRecord>(
  projectSlug: string,
  primaryIdKey: string,
  projectName: string,
  callbacks: ColumnActionsCallbacks<T>,
  permissions?: Permission,
): ColumnDef<ProjectTableFeatures, T>[] {
  const userRole = useAuthStore.getState().user?.role;
  const systemCols = getSystemColumns<T>(primaryIdKey);

  const columns: ColumnDef<ProjectTableFeatures, T>[] = [
    getSelectColumn<T>(),
    systemCols[0], // ID column
    ...getSpecificColumns<T>(projectSlug),
    systemCols[1], // Created At
    systemCols[2], // Updated At
    getActionsColumn<T>(projectSlug, primaryIdKey, projectName, callbacks, permissions),
  ];

  return columns.filter((col) => {
    const colKey = (col.id || (col as { accessorKey?: string }).accessorKey) as string;
    return isColumnVisible(userRole, projectSlug, colKey);
  });
}
