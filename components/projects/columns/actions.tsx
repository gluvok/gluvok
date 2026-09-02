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
  Ticket,
  Eye,
  MessageSquare,
  Scale,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { getField, useEntitiesStore } from "@/lib/store";
import { type EntityRecord, type Ticket as TicketEntity } from "@/types";
import { type ColumnActionsCallbacks } from "./index";
import { EntityDialog } from "@/components/projects/dialog";

import { type Permission, useAuthStore, type AuthUser, hasPermission } from "@/lib/store";
import {
  ProjectSlug,
  Role,
  WeighmentType,
  EntryStatus,
  PermissionKey,
  DialogMode,
} from "@/lib/constants/enums";
import { downloadPDF } from "@/lib/pdf";
import { formatDateTime } from "@/lib/utils";

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

    case ProjectSlug.TICKETS: {
      if (currentUser.role === Role.ADMIN) return true;
      const authorId = getField(item, "user_id");
      return String(authorId) === String(currentUser.id);
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
    const vehicleNumber = getField(item, "vehicle_number");
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

      {projectSlug === ProjectSlug.TICKETS &&
        (() => {
          const ticket = item as unknown as TicketEntity;
          const authorName =
            ticket.users?.name || ticket.user_name || `User #${getField(item, "user_id")}`;
          const entryPlate = ticket.entries?.vehicle_number;
          const entryWeight = ticket.entries?.weight;
          const weighmentPlate = ticket.weighments?.in_entry?.vehicle_number;
          const weighmentNet = ticket.weighments?.net_weight;
          const weighmentUnit = ticket.weighments?.unit;

          return (
            <Dialog open={viewTicketOpen} onOpenChange={setViewTicketOpen}>
              <DialogContent className="w-[92vw] sm:w-full max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Ticket className="h-4 w-4" />
                    </div>
                    Ticket #{itemId}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                    Raised by {authorName} on {formatDateTime(String(getField(item, "created_at")))}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-3 space-y-4 text-xs">
                  <div className="p-3 rounded-lg border border-border/70 bg-muted/30 space-y-1">
                    <div className="font-semibold text-2xs uppercase tracking-wider text-muted-foreground">
                      Linked Target
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.entry_id ? (
                        <>
                          <Truck className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="font-semibold text-foreground">
                              Entry #{ticket.entry_id}
                            </span>
                            {entryPlate ? (
                              <span className="text-muted-foreground font-mono ml-1.5">
                                (Plate: {entryPlate} · {entryWeight} kg)
                              </span>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <>
                          <Scale className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="font-semibold text-foreground">
                              Weighment #{ticket.weighment_id}
                            </span>
                            {weighmentPlate ? (
                              <span className="text-muted-foreground font-mono ml-1.5">
                                (Plate: {weighmentPlate} · Net: {weighmentNet} {weighmentUnit})
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-2xs uppercase tracking-wider text-muted-foreground">
                      Concern
                    </div>
                    <div className="p-3 rounded-lg border border-border/70 bg-background text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {String(getField(item, "concern") || "")}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-2xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-primary" /> Support Response
                      </span>
                      <span className="text-2xs font-medium">
                        Status:{" "}
                        <span className="capitalize font-semibold text-foreground">
                          {String(getField(item, "status") || "pending")}
                        </span>
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border border-border/70 bg-muted/40 text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {getField(item, "reply") && String(getField(item, "reply")).trim() ? (
                        String(getField(item, "reply"))
                      ) : (
                        <span className="text-muted-foreground/60 italic">
                          This ticket is currently pending review by the system administrator.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mx-0 mb-0 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setViewTicketOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}
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
    enableGlobalFilter: false,
  };
}
