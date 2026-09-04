"use client";

/**
 * @file components/projects/columns/actions/action-cell-dialogs.tsx
 * @description Dialogs mounted conditionally for row actions (entry approvals, rejections, and ticket raise/view modals).
 */

import * as React from "react";
import { type EntityRecord } from "@/types";
import { EntityDialog } from "@/components/projects/dialog";
import { ProjectSlug, DialogMode } from "@/lib/constants/enums";
import { EntryApproveDialog, EntryRejectDialog } from "./entry-status-dialogs";

interface ActionCellDialogsProps<T extends EntityRecord> {
  item: T;
  itemId: string;
  vehicleNumber: string;
  projectSlug: string;
  canApproveEntry: boolean;
  canRejectEntry: boolean;
  canRaiseTicket: boolean;
  approving: boolean;
  setApproving: (open: boolean) => void;
  rejecting: boolean;
  setRejecting: (open: boolean) => void;
  ticketDialogOpen: boolean;
  setTicketDialogOpen: (open: boolean) => void;
  viewTicketOpen: boolean;
  setViewTicketOpen: (open: boolean) => void;
  statusLoading: boolean;
  confirmApprove: () => Promise<void>;
  confirmReject: () => Promise<void>;
}

export function ActionCellDialogs<T extends EntityRecord>({
  item,
  itemId,
  vehicleNumber,
  projectSlug,
  canApproveEntry,
  canRejectEntry,
  canRaiseTicket,
  approving,
  setApproving,
  rejecting,
  setRejecting,
  ticketDialogOpen,
  setTicketDialogOpen,
  viewTicketOpen,
  setViewTicketOpen,
  statusLoading,
  confirmApprove,
  confirmReject,
}: ActionCellDialogsProps<T>) {
  return (
    <>
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
    </>
  );
}
