/**
 * @file components/projects/columns/actions/index.tsx
 * @description Column definitions and action menu orchestration for data table rows.
 */

import { type ColumnDef, type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { type Permission } from "@/lib/store";
import { type EntityRecord } from "@/types";
import { type ColumnActionsCallbacks } from "../index";
import { ActionCell } from "./action-cell";

export * from "./permissions";
export * from "./action-cell";
export * from "./entry-status-dialogs";

export function getActionsColumn<T extends EntityRecord>(
  projectSlug: string,
  primaryIdKey: string,
  projectName: string,
  callbacks: ColumnActionsCallbacks<T>,
  permissions?: Permission,
): ColumnDef<ProjectTableFeatures, T> {
  const canWrite = permissions?.write ?? false;
  const canDelete = permissions?.delete ?? false;

  return {
    id: "actions",
    cell: ({ row, table }) => (
      <ActionCell
        item={row.original}
        row={row}
        table={table as unknown as Table<ProjectTableFeatures, T>}
        projectSlug={projectSlug}
        primaryIdKey={primaryIdKey}
        projectName={projectName}
        callbacks={callbacks}
        canWrite={canWrite}
        canDelete={canDelete}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}
