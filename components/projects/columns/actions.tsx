/**
 * @file components/projects/columns/actions.tsx
 * @description Column definitions and rendering helpers for the Actions entity table.
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
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
import { MoreHorizontal, Copy, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getField, useEntitiesStore } from "@/lib/store";
import { type EntityRecord } from "@/types";
import { type ColumnActionsCallbacks } from "./index";

import { type Permission, useAuthStore, type AuthUser } from "@/lib/store";
import { ProjectSlug, EntityKey, Role, WeighmentType, EntryStatus } from "@/lib/constants/enums";

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
      const itemId = getField(item, EntityKey.ID);
      const itemRole = getField(item, EntityKey.ROLE);

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
  projectSlug: string;
  primaryIdKey: string;
  callbacks: ColumnActionsCallbacks<T>;
  canWrite: boolean;
  canDelete: boolean;
}

function ActionCell<T extends EntityRecord>({
  item,
  projectSlug,
  primaryIdKey,
  callbacks,
  canWrite,
  canDelete,
}: ActionCellProps<T>) {
  const itemId = String(getField(item, primaryIdKey));
  const currentUser = useAuthStore((state) => state.user);

  const canModifyRow = hasRowModifyPermission(item, projectSlug, currentUser);
  let hasRowWrite = canWrite && canModifyRow;
  let canApproveEntry = false;
  let canRejectEntry = false;

  if (projectSlug === ProjectSlug.WEIGHMENTS) {
    const typeVal = getField(item, EntityKey.TYPE);
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
    const entryStatus = getField(item, EntityKey.STATUS) as EntryStatus | string;
    const customerId = getField(item, EntityKey.CUSTOMER_ID);

    if (entryStatus === EntryStatus.REJECTED) {
      hasRowWrite = false;
    } else if (entryStatus === EntryStatus.APPROVED) {
      if (customerId !== null && customerId !== undefined && customerId !== "") {
        hasRowWrite = false;
      }
    } else if (entryStatus === EntryStatus.PENDING) {
      canApproveEntry = hasRowWrite;
      canRejectEntry = hasRowWrite;
    }
  }

  const hasRowDelete = canDelete && canModifyRow;

  const handleApprove = async () => {
    try {
      await useEntitiesStore.getState().updateEntity(ProjectSlug.ENTRIES, itemId, {
        [EntityKey.STATUS]: EntryStatus.APPROVED,
      });
      toast.success("Entry approved successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve entry";
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    try {
      await useEntitiesStore.getState().updateEntity(ProjectSlug.ENTRIES, itemId, {
        [EntityKey.STATUS]: EntryStatus.REJECTED,
      });
      toast.success("Entry marked as rejected");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject entry";
      toast.error(msg);
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
          {canApproveEntry && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                id={`actions-approve-${projectSlug}-${itemId}`}
                className="text-xs cursor-pointer gap-2 py-2 text-emerald-600 focus:text-emerald-700 dark:text-emerald-400 dark:focus:text-emerald-300"
                onClick={handleApprove}
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
              onClick={handleReject}
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
    </div>
  );
}

export function getActionsColumn<T extends EntityRecord>(
  projectSlug: string,
  primaryIdKey: string,
  _projectName: string,
  callbacks: ColumnActionsCallbacks<T>,
  permissions?: Permission,
): ColumnDef<ProjectTableFeatures, T> {
  const canWrite = permissions?.write ?? true;
  const canDelete = permissions?.delete ?? true;

  return {
    id: "actions",
    cell: ({ row }) => (
      <ActionCell
        item={row.original}
        projectSlug={projectSlug}
        primaryIdKey={primaryIdKey}
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
