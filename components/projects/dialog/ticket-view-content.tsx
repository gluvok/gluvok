"use client";

/**
 * @file components/projects/dialog/ticket-view-content.tsx
 * @description View-only modal content for inspecting ticket concerns, linked entities, and admin responses.
 */

import React from "react";
import { Ticket, Scale, Truck, CircleAlert, UserCog, MessageSquare, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getField } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import { type EntityRecord, type Ticket as TicketEntity } from "@/types";

interface TicketViewContentProps {
  item: EntityRecord;
  primaryIdKey: string;
  onOpenChange: (open: boolean) => void;
}

export function TicketViewContent({ item, primaryIdKey, onOpenChange }: TicketViewContentProps) {
  const ticket = item as unknown as TicketEntity;
  const itemId = String(getField(item, primaryIdKey));
  const authorName = ticket.users?.name || ticket.user_name || `User #${ticket.user_id}`;
  const authorUsername = ticket.users?.username || ticket.user_username;
  const entryPlate = ticket.entries?.vehicle_number;
  const entryWeight = ticket.entries?.weight;
  const weighmentPlate = ticket.weighments?.in_entry?.vehicle_number;
  const weighmentNet = ticket.weighments?.net_weight;
  const weighmentUnit = ticket.weighments?.unit;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Ticket className="h-4 w-4" />
          </div>
          Ticket #{itemId}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground pt-0.5 flex items-center gap-1.5">
          <UserCog className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
          <span>
            Raised by <strong className="text-foreground">{authorName}</strong>
            {authorUsername ? ` (@${authorUsername})` : ""} on{" "}
            {formatDateTime(String(ticket.created_at))}
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="py-3 space-y-4 text-xs">
        {/* Linked Target Card */}
        <div className="p-3 rounded-lg border border-border/70 bg-muted/30 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-2xs uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3 text-muted-foreground/70" />
            Linked Target
          </div>
          <div className="flex items-center gap-2">
            {ticket.entry_id ? (
              <>
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Entry #{ticket.entry_id}</span>
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

        {/* Concern Section */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-2xs uppercase tracking-wider text-muted-foreground">
            <CircleAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Concern
          </div>
          <div className="p-3 rounded-lg border border-border/70 bg-background text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {String(ticket.concern || "")}
          </div>
        </div>

        {/* Support Response Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-2xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-primary" /> Support Response
            </span>
            <span className="text-2xs font-medium">
              Status:{" "}
              <span className="capitalize font-semibold text-foreground">
                {String(ticket.status || "pending")}
              </span>
            </span>
          </div>
          <div className="p-3 rounded-lg border border-border/70 bg-muted/40 text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {ticket.reply && ticket.reply.trim() ? (
              ticket.reply
            ) : (
              <span className="text-muted-foreground/60 italic">
                This ticket is currently pending review by the system administrator.
              </span>
            )}
          </div>
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 pt-2 flex flex-row items-center justify-end">
        <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}
