/**
 * @file components/projects/columns/actions/action-cell.tsx
 * @description Action dropdown cell component and dialog orchestrator for table rows.
 */

import * as React from "react";
import { type Row, type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  FileDown,
  Ticket,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { getField, useEntitiesStore, useAuthStore, hasPermission } from "@/lib/store";
import { type EntityRecord } from "@/types";
import { type ColumnActionsCallbacks } from "../index";
import { EntityDialog } from "@/components/projects/dialog";
import {
  ProjectSlug,
  WeighmentType,
  EntryStatus,
  PermissionKey,
  DialogMode,
} from "@/lib/constants/enums";
import { downloadPDF } from "@/lib/pdf";
import { hasRowModifyPermission } from "./permissions";
import { EntryApproveDialog, EntryRejectDialog } from "./entry-status-dialogs";

export interface ActionCellProps<T extends EntityRecord> {
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

export function ActionCell<T extends EntityRecord>({
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
  const [ticketDialogOpen, setTicketDialogOpen] = React.useState(false);
  const [viewTicketOpen, setViewTicketOpen] = React.useState(false);
  const vehicleNumber = String(getField(item, "vehicle_number") || "");

  const canRaiseTicket =
    (projectSlug === ProjectSlug.ENTRIES || projectSlug === ProjectSlug.WEIGHMENTS) &&
    currentUser !== null &&
    hasPermission(currentUser, ProjectSlug.TICKETS, PermissionKey.CREATE);

  const canModifyRow = hasRowModifyPermission(item, projectSlug, currentUser);
  let hasRowWrite = canWrite && canModifyRow;
  let canApproveEntry = false;
  let canRejectEntry = false;

  if (projectSlug === ProjectSlug.WEIGHMENTS) {
    const typeVal = getField(item, "type");
    const rateIdVal = getField(item, "rate_id");
    const isTypeFixed =
      typeVal !== null &&
      typeVal !== undefined &&
      typeVal !== "" &&
      typeVal !== WeighmentType.UNASSIGNED;
    const isRateFixed = rateIdVal !== null && rateIdVal !== undefined && rateIdVal !== "";
    if (isTypeFixed && isRateFixed) {
      hasRowWrite = false;
    }
  }

  if (projectSlug === ProjectSlug.ENTRIES) {
    const entryStatus = getField(item, "status") as EntryStatus | string;
    const isAutoApproved = Boolean(getField(item, "auto_approved"));
    const detectedVehicle = getField(item, "detected_vehicle_number");
    const isEdited = Boolean(detectedVehicle && vehicleNumber && detectedVehicle !== vehicleNumber);
    const customerId = getField(item, "customer_id");
    const isApproved = entryStatus === EntryStatus.APPROVED || isAutoApproved;
    const hasCustomer = customerId !== null && customerId !== undefined && customerId !== "";

    const isNoPlate = vehicleNumber === "NO_PLATE_DETECTED";

    if (entryStatus === EntryStatus.REJECTED) {
      hasRowWrite = false;
    } else if (isApproved) {
      if (hasCustomer && (!isAutoApproved || isEdited)) {
        hasRowWrite = false;
      }
    } else if (entryStatus === EntryStatus.PENDING) {
      canApproveEntry = hasRowWrite && !isNoPlate;
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
            className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/70 transition-colors focus-visible:ring-1 focus-visible:ring-ring"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44 p-1 rounded-xl border border-border/70 shadow-sm bg-popover"
        >
          <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 py-1">
            Actions
          </DropdownMenuLabel>
          <DropdownMenuItem
            id={`actions-copy-${projectSlug}-${itemId}`}
            className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-muted focus:text-foreground"
            onClick={() => {
              navigator.clipboard.writeText(itemId);
              toast.success("Identifier copied to clipboard");
            }}
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground/70" /> Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem
            id={`actions-download-pdf-${projectSlug}-${itemId}`}
            className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-muted focus:text-foreground"
            onClick={() => downloadPDF(table, projectName, undefined, [row], projectSlug)}
          >
            <FileDown className="h-3.5 w-3.5 text-muted-foreground/70" /> Download PDF
          </DropdownMenuItem>
          {projectSlug === ProjectSlug.TICKETS && (
            <DropdownMenuItem
              id={`actions-view-ticket-${itemId}`}
              className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-muted focus:text-foreground"
              onClick={() => setViewTicketOpen(true)}
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground/70" /> View Details
            </DropdownMenuItem>
          )}
          {canRaiseTicket && (
            <DropdownMenuItem
              id={`actions-ticket-${projectSlug}-${itemId}`}
              className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-muted focus:text-foreground"
              onClick={() => setTicketDialogOpen(true)}
            >
              <Ticket className="h-3.5 w-3.5 text-muted-foreground/70" /> Raise Ticket
            </DropdownMenuItem>
          )}
          {canApproveEntry && (
            <>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              <DropdownMenuItem
                id={`actions-approve-${projectSlug}-${itemId}`}
                className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-700 dark:focus:text-emerald-300 transition-colors"
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
              className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg text-rose-600 dark:text-rose-400 focus:bg-rose-500/10 focus:text-rose-700 dark:focus:text-rose-300 transition-colors"
              onClick={() => setRejecting(true)}
            >
              <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" /> Reject
            </DropdownMenuItem>
          )}
          {hasRowWrite && (
            <>
              {!canApproveEntry && !canRejectEntry && (
                <DropdownMenuSeparator className="my-1 bg-border/50" />
              )}
              <DropdownMenuItem
                id={`actions-edit-${projectSlug}-${itemId}`}
                className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-muted focus:text-foreground"
                onClick={() => callbacks.onEdit(item)}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground/70" /> Edit
              </DropdownMenuItem>
            </>
          )}
          {hasRowDelete && (
            <>
              {(!hasRowWrite || canApproveEntry || canRejectEntry) && (
                <DropdownMenuSeparator className="my-1 bg-border/50" />
              )}
              <DropdownMenuItem
                id={`actions-delete-${projectSlug}-${itemId}`}
                className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                onClick={() => callbacks.onDelete(item)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve Confirmation Dialog */}
      {canApproveEntry && (
        <EntryApproveDialog
          open={approving}
          onOpenChange={setApproving}
          itemId={itemId}
          vehicleNumber={vehicleNumber}
          loading={statusLoading}
          onConfirm={confirmApprove}
        />
      )}

      {/* Reject Confirmation Dialog */}
      {canRejectEntry && (
        <EntryRejectDialog
          open={rejecting}
          onOpenChange={setRejecting}
          itemId={itemId}
          vehicleNumber={vehicleNumber}
          loading={statusLoading}
          onConfirm={confirmReject}
        />
      )}

      {/* Standard EntityDialog for Raising Tickets */}
      {canRaiseTicket && (
        <EntityDialog
          mode={DialogMode.CREATE}
          open={ticketDialogOpen}
          onOpenChange={setTicketDialogOpen}
          projectSlug={ProjectSlug.TICKETS}
          projectName="Tickets"
          primaryIdKey="id"
          item={item}
        />
      )}

      {/* Standard EntityDialog for Viewing Ticket Details / Response */}
      {projectSlug === ProjectSlug.TICKETS && (
        <EntityDialog
          mode={DialogMode.VIEW}
          open={viewTicketOpen}
          onOpenChange={setViewTicketOpen}
          projectSlug={ProjectSlug.TICKETS}
          projectName="Tickets"
          primaryIdKey="id"
          item={item}
        />
      )}
    </div>
  );
}
