/**
 * @file components/projects/columns/actions.tsx
 * @description Column definitions and rendering helpers for the Actions entity table.
 */

"use client";

import * as React from "react";
import { type ColumnDef, type Row, type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { getField, useEntitiesStore } from "@/lib/store";
import { type EntityRecord } from "@/types";
import { type ColumnActionsCallbacks } from "./index";

import { type Permission, useAuthStore, type AuthUser } from "@/lib/store";
import { ProjectSlug, Role, WeighmentType, EntryStatus } from "@/lib/constants/enums";
import { downloadPDF } from "@/lib/pdf";

/**
 * hasRowModifyPermission
 * Helper function to determine if the currently logged-in user is authorized to
 * edit or delete a specific record based on RLS and RBAC rules.
 */
function hasRowModifyPermission(
  item: EntityRecord,
  projectSlug: string,
  currentUser: AuthUser | null,
): boolean {
  if (!currentUser) return false;

  switch (projectSlug) {
    case ProjectSlug.USERS: {
      const itemId = getField(item, "id");
      const itemRole = getField(item, "role");

      const isOwnUser = String(itemId) === String(currentUser.id);
      const isAdminOfFactory = currentUser.role === Role.ADMIN;
      const isManagerOfFactory = currentUser.role === Role.MANAGER;

      return (
        isOwnUser ||
        (isAdminOfFactory && [Role.MANAGER, Role.OPERATOR, Role.BASE].includes(itemRole as Role)) ||
        (isManagerOfFactory && [Role.OPERATOR, Role.BASE].includes(itemRole as Role))
      );
    }

    default:
      return true;
  }
}

interface ActionCellProps<T extends EntityRecord> {
  item: T;
  row: Row<ProjectTableFeatures, T>;
  table: Table<ProjectTableFeatures, T>;
  projectSlug: string;
  primaryIdKey: string;
  projectName: string;
  callbacks: ColumnActionsCallbacks<T>;
  canWrite: boolean;
  canDelete: boolean;
}

function ActionCell<T extends EntityRecord>({
  item,
  row,
  table,
  projectSlug,
  primaryIdKey,
  projectName,
  callbacks,
  canWrite,
  canDelete,
}: ActionCellProps<T>) {
  const itemId = String(getField(item, primaryIdKey));
  const currentUser = useAuthStore((state) => state.user);
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [statusLoading, setStatusLoading] = React.useState(false);
  const vehicleNumber = String(getField(item, "vehicle_number") || "");

  const canModifyRow = hasRowModifyPermission(item, projectSlug, currentUser);
  let hasRowWrite = canWrite && canModifyRow;
  let canApproveEntry = false;
  let canRejectEntry = false;

  if (projectSlug === ProjectSlug.WEIGHMENTS) {
    const typeVal = getField(item, "type");
    const isTypeFixed =
      typeVal !== null &&
      typeVal !== undefined &&
      typeVal !== "" &&
      typeVal !== WeighmentType.UNASSIGNED;
    if (isTypeFixed) {
      hasRowWrite = false;
    }
  }

  if (projectSlug === ProjectSlug.ENTRIES) {
    const entryStatus = getField(item, "status") as EntryStatus | string;
    const isAutoApproved = Boolean(getField(item, "auto_approved"));
    const isEdited = Boolean(getField(item, "edited"));
    const customerId = getField(item, "customer_id");
    const isApproved = entryStatus === EntryStatus.APPROVED || isAutoApproved;
    const hasCustomer = customerId !== null && customerId !== undefined && customerId !== "";

    if (entryStatus === EntryStatus.REJECTED) {
      hasRowWrite = false;
    } else if (isApproved) {
      if (hasCustomer && (!isAutoApproved || isEdited)) {
        hasRowWrite = false;
      }
    } else if (entryStatus === EntryStatus.PENDING) {
      canApproveEntry = hasRowWrite;
      canRejectEntry = hasRowWrite;
    }
  }

  const hasRowDelete = canDelete && canModifyRow;

  const confirmApprove = async () => {
    try {
      setStatusLoading(true);
      await useEntitiesStore.getState().updateEntity(ProjectSlug.ENTRIES, itemId, {
        status: EntryStatus.APPROVED,
      });
      toast.success(`Entry "${itemId}" approved successfully`);
      setApproving(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve entry";
      toast.error(msg);
    } finally {
      setStatusLoading(false);
    }
  };

  const confirmReject = async () => {
    try {
      setStatusLoading(true);
      await useEntitiesStore.getState().updateEntity(ProjectSlug.ENTRIES, itemId, {
        status: EntryStatus.REJECTED,
      });
      toast.success(`Entry "${itemId}" marked as rejected`);
      setRejecting(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject entry";
      toast.error(msg);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="text-right pr-4">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            id={`actions-trigger-${projectSlug}-${itemId}`}
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
            Actions
          </DropdownMenuLabel>
          <DropdownMenuItem
            id={`actions-copy-${projectSlug}-${itemId}`}
            className="text-xs cursor-pointer gap-2 py-2"
            onClick={() => {
              navigator.clipboard.writeText(itemId);
              toast.success("Identifier copied to clipboard");
            }}
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem
            id={`actions-download-pdf-${projectSlug}-${itemId}`}
            className="text-xs cursor-pointer gap-2 py-2"
            onClick={() => downloadPDF(table, projectName, undefined, [row])}
          >
            <FileDown className="h-3.5 w-3.5 text-muted-foreground" /> Download PDF
          </DropdownMenuItem>
          {canApproveEntry && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                id={`actions-approve-${projectSlug}-${itemId}`}
                className="text-xs cursor-pointer gap-2 py-2 text-emerald-600 focus:text-emerald-700 dark:text-emerald-400 dark:focus:text-emerald-300"
                onClick={() => setApproving(true)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                Approve
              </DropdownMenuItem>
            </>
          )}
          {canRejectEntry && (
            <DropdownMenuItem
              id={`actions-reject-${projectSlug}-${itemId}`}
              className="text-xs cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-300"
              onClick={() => setRejecting(true)}
            >
              <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" /> Reject
            </DropdownMenuItem>
          )}
          {hasRowWrite && (
            <>
              {!canApproveEntry && !canRejectEntry && <DropdownMenuSeparator />}
              <DropdownMenuItem
                id={`actions-edit-${projectSlug}-${itemId}`}
                className="text-xs cursor-pointer gap-2 py-2"
                onClick={() => callbacks.onEdit(item)}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit
              </DropdownMenuItem>
            </>
          )}
          {hasRowDelete && (
            <>
              {(!hasRowWrite || canApproveEntry || canRejectEntry) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                id={`actions-delete-${projectSlug}-${itemId}`}
                className="text-xs cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => callbacks.onDelete(item)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canApproveEntry && (
        <Dialog open={approving} onOpenChange={setApproving}>
          <DialogContent showCloseButton={false} className="w-[92vw] sm:w-full max-w-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Approve Entry
              </DialogTitle>
              <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground text-left">
                Are you sure you want to approve entry{" "}
                <span className="font-semibold text-foreground">ID: {itemId}</span>
                {vehicleNumber ? (
                  <>
                    {" "}
                    (Vehicle: <span className="font-semibold text-foreground">{vehicleNumber}</span>
                    )
                  </>
                ) : null}
                ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 mx-0 mb-0 flex flex-row items-center justify-end gap-3">
              <Button
                id={`approve-cancel-${itemId}`}
                variant="ghost"
                size="sm"
                onClick={() => setApproving(false)}
                disabled={statusLoading}
                className="gap-1.5 h-8 px-3 text-xs"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button
                id={`approve-confirm-${itemId}`}
                size="sm"
                onClick={confirmApprove}
                disabled={statusLoading}
                className="gap-1.5 h-8 px-3 text-xs shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {canRejectEntry && (
        <Dialog open={rejecting} onOpenChange={setRejecting}>
          <DialogContent showCloseButton={false} className="w-[92vw] sm:w-full max-w-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <div className="p-1.5 rounded-lg bg-rose-500/10">
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                Reject Entry
              </DialogTitle>
              <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground text-left">
                Are you sure you want to reject entry{" "}
                <span className="font-semibold text-foreground">ID: {itemId}</span>
                {vehicleNumber ? (
                  <>
                    {" "}
                    (Vehicle: <span className="font-semibold text-foreground">{vehicleNumber}</span>
                    )
                  </>
                ) : null}
                ? This entry will be locked and cannot be merged into weighments.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 mx-0 mb-0 flex flex-row items-center justify-end gap-3">
              <Button
                id={`reject-cancel-${itemId}`}
                variant="ghost"
                size="sm"
                onClick={() => setRejecting(false)}
                disabled={statusLoading}
                className="gap-1.5 h-8 px-3 text-xs"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button
                id={`reject-confirm-${itemId}`}
                variant="destructive"
                size="sm"
                onClick={confirmReject}
                disabled={statusLoading}
                className="gap-1.5 h-8 px-3 text-xs shadow-sm bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function getActionsColumn<T extends EntityRecord>(
  projectSlug: string,
  primaryIdKey: string,
  projectName: string,
  callbacks: ColumnActionsCallbacks<T>,
  permissions?: Permission,
): ColumnDef<ProjectTableFeatures, T> {
  const canWrite = permissions?.write ?? true;
  const canDelete = permissions?.delete ?? true;

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
    enableGlobalFilter: false,
  };
}
