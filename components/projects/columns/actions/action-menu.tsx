"use client";

/**
 * @file components/projects/columns/actions/action-menu.tsx
 * @description Dropdown menu content for row action triggers (copy, pdf, approve, reject, edit, delete, tickets).
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
import { downloadPDF } from "@/lib/pdf";
import { ProjectSlug } from "@/lib/constants/enums";
import { type EntityRecord } from "@/types";
import { type ColumnActionsCallbacks } from "../index";

interface ActionMenuProps<T extends EntityRecord> {
  item: T;
  row: Row<ProjectTableFeatures, T>;
  table: Table<ProjectTableFeatures, T>;
  projectSlug: string;
  itemId: string;
  projectName: string;
  callbacks: ColumnActionsCallbacks<T>;
  canRaiseTicket: boolean;
  canApproveEntry: boolean;
  canRejectEntry: boolean;
  hasRowWrite: boolean;
  hasRowDelete: boolean;
  onViewTicket: () => void;
  onRaiseTicket: () => void;
  onApproveEntry: () => void;
  onRejectEntry: () => void;
}

export function ActionMenu<T extends EntityRecord>({
  item,
  row,
  table,
  projectSlug,
  itemId,
  projectName,
  callbacks,
  canRaiseTicket,
  canApproveEntry,
  canRejectEntry,
  hasRowWrite,
  hasRowDelete,
  onViewTicket,
  onRaiseTicket,
  onApproveEntry,
  onRejectEntry,
}: ActionMenuProps<T>) {
  return (
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
          className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-sky-500/10 focus:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(itemId);
            toast.success("Identifier copied to clipboard");
          }}
        >
          <Copy className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" /> Copy ID
        </DropdownMenuItem>
        <DropdownMenuItem
          id={`actions-download-pdf-${projectSlug}-${itemId}`}
          className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-rose-500/10 focus:text-foreground"
          onClick={() => downloadPDF(table, projectName, undefined, [row], projectSlug)}
        >
          <FileDown className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" /> Download PDF
        </DropdownMenuItem>
        {projectSlug === ProjectSlug.TICKETS && (
          <DropdownMenuItem
            id={`actions-view-ticket-${itemId}`}
            className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-blue-500/10 focus:text-foreground"
            onClick={onViewTicket}
          >
            <Eye className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /> View Details
          </DropdownMenuItem>
        )}
        {canRaiseTicket && (
          <DropdownMenuItem
            id={`actions-ticket-${projectSlug}-${itemId}`}
            className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg text-amber-600 dark:text-amber-400 focus:bg-amber-500/10 focus:text-amber-700 dark:focus:text-amber-300 transition-colors"
            onClick={onRaiseTicket}
          >
            <Ticket className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> Raise Ticket
          </DropdownMenuItem>
        )}
        {canApproveEntry && (
          <>
            <DropdownMenuSeparator className="my-1 bg-border/50" />
            <DropdownMenuItem
              id={`actions-approve-${projectSlug}-${itemId}`}
              className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-700 dark:focus:text-emerald-300 transition-colors"
              onClick={onApproveEntry}
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
            onClick={onRejectEntry}
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
              className="text-xs cursor-pointer gap-2 py-1.5 px-2 rounded-lg transition-colors focus:bg-indigo-500/10 focus:text-foreground"
              onClick={() => callbacks.onEdit(item)}
            >
              <Pencil className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" /> Edit
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
  );
}
