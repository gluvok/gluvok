"use client";

/**
 * @file components/projects/columns/actions/action-cell.tsx
 * @description Action dropdown cell component and dialog orchestrator for table rows.
 */

import * as React from "react";
import { type Row, type Table } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { toast } from "sonner";
import { getField, useEntitiesStore, useAuthStore, hasPermission } from "@/lib/store";
import { type EntityRecord } from "@/types";
import { type ColumnActionsCallbacks } from "../index";
import { ProjectSlug, WeighmentType, EntryStatus, PermissionKey } from "@/lib/constants/enums";
import { hasRowModifyPermission } from "./permissions";
import { ActionMenu } from "./action-menu";
import { ActionCellDialogs } from "./action-cell-dialogs";

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
      <ActionMenu
        item={item}
        row={row}
        table={table}
        projectSlug={projectSlug}
        itemId={itemId}
        projectName={projectName}
        callbacks={callbacks}
        canRaiseTicket={canRaiseTicket}
        canApproveEntry={canApproveEntry}
        canRejectEntry={canRejectEntry}
        hasRowWrite={hasRowWrite}
        hasRowDelete={hasRowDelete}
        onViewTicket={() => setViewTicketOpen(true)}
        onRaiseTicket={() => setTicketDialogOpen(true)}
        onApproveEntry={() => setApproving(true)}
        onRejectEntry={() => setRejecting(true)}
      />

      <ActionCellDialogs
        item={item}
        itemId={itemId}
        vehicleNumber={vehicleNumber}
        projectSlug={projectSlug}
        canApproveEntry={canApproveEntry}
        canRejectEntry={canRejectEntry}
        canRaiseTicket={canRaiseTicket}
        approving={approving}
        setApproving={setApproving}
        rejecting={rejecting}
        setRejecting={setRejecting}
        ticketDialogOpen={ticketDialogOpen}
        setTicketDialogOpen={setTicketDialogOpen}
        viewTicketOpen={viewTicketOpen}
        setViewTicketOpen={setViewTicketOpen}
        statusLoading={statusLoading}
        confirmApprove={confirmApprove}
        confirmReject={confirmReject}
      />
    </div>
  );
}
