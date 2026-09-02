/**
 * @file components/projects/columns/tickets.tsx
 * @description Column definitions and rendering helpers for the Tickets entity table.
 */

import { type ColumnDef, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import {
  Truck,
  Scale,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  CircleAlert,
  UserCog,
  Layers,
} from "lucide-react";
import { createCustomColumn } from "./helpers";
import { TicketStatus } from "@/lib/constants/enums";

export function getTicketsColumns<T extends RowData>(): ColumnDef<ProjectTableFeatures, T>[] {
  return [
    createCustomColumn<T>("target", "Linked Target", Layers, (_val, row) => {
      const rec = row as Record<string, unknown>;
      const entryId = rec.entry_id;
      const weighmentId = rec.weighment_id;
      const entries = rec.entries as { vehicle_number?: string; weight?: number } | undefined;
      const weighments = rec.weighments as
        | {
            unit?: string;
            net_weight?: number;
            in_entry?: { vehicle_number?: string } | null;
          }
        | undefined;

      if (entryId) {
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/70 bg-muted/50 text-2xs font-medium text-foreground">
            <Truck className="h-3 w-3 text-muted-foreground/70 shrink-0" />
            <span>Entry #{String(entryId)}</span>
            {entries?.vehicle_number ? (
              <span className="font-mono text-muted-foreground">({entries.vehicle_number})</span>
            ) : null}
          </div>
        );
      }

      if (weighmentId) {
        const plate = weighments?.in_entry?.vehicle_number;
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/70 bg-muted/50 text-2xs font-medium text-foreground">
            <Scale className="h-3 w-3 text-muted-foreground/70 shrink-0" />
            <span>Weighment #{String(weighmentId)}</span>
            {plate ? <span className="font-mono text-muted-foreground">({plate})</span> : null}
          </div>
        );
      }

      return <span className="text-muted-foreground text-xs">—</span>;
    }),

    createCustomColumn<T>("concern", "Concern", CircleAlert, (val) => {
      const text = String(val || "");
      return (
        <p className="truncate max-w-xs text-foreground/90 font-normal text-xs" title={text}>
          {text || "—"}
        </p>
      );
    }),

    createCustomColumn<T>("status", "Status", Clock, (val) => {
      const status = val as TicketStatus;
      if (status === TicketStatus.APPROVED) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      }
      if (status === TicketStatus.REJECTED) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    }),

    createCustomColumn<T>("reply", "Support Reply", MessageSquare, (val) => {
      const replyText = String(val || "").trim();
      if (!replyText) {
        return <span className="text-muted-foreground/50 text-2xs italic">Awaiting response</span>;
      }
      return (
        <div
          className="flex items-center gap-1.5 text-foreground/80 truncate max-w-xs text-xs"
          title={replyText}
        >
          <MessageSquare className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{replyText}</span>
        </div>
      );
    }),

    createCustomColumn<T>("user_id", "Raised By", UserCog, (val, row) => {
      const rec = row as Record<string, unknown>;
      const users = rec.users as { name?: string; username?: string } | undefined;
      const name = users?.name || rec.user_name || `User #${String(val)}`;
      const username = users?.username || rec.user_username;

      return (
        <div className="text-xs">
          <div className="font-medium text-foreground">{String(name)}</div>
          {username ? (
            <div className="text-2xs text-muted-foreground font-mono">{String(username)}</div>
          ) : null}
        </div>
      );
    }),
  ];
}
