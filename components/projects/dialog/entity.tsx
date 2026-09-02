"use client";

/**
 * @file components/projects/dialog/entity.tsx
 * @description Dialog modal wrapper for rendering entity creation or editing forms.
 */

import { type EntityRecord } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, ArrowRight, Scale, Unlink } from "lucide-react";
import { getField } from "@/lib/store";
import { DialogMode } from "@/lib/constants/enums";
import { useEntityForm } from "./use-entity-form";
import { EntityDialogContent } from "./entity-content";

interface EntityDialogProps {
  mode: DialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  projectName: string;
  primaryIdKey: string;
  item?: EntityRecord | null;
}

/**
 * EntityDialog Component
 * Mounts standard form overlay dialog wrapping EntityDialogContent and integrating useEntityForm hook.
 */
export function EntityDialog(props: EntityDialogProps) {
  const formState = useEntityForm(props);

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="w-[92vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <EntityDialogContent
            mode={props.mode}
            onOpenChange={props.onOpenChange}
            projectName={props.projectName}
            projectSlug={props.projectSlug}
            primaryIdKey={props.primaryIdKey}
            {...formState}
          />
        </DialogContent>
      </Dialog>

      {formState.tripModalOpen && formState.linkedWeighment && (
        <Dialog open={formState.tripModalOpen} onOpenChange={formState.setTripModalOpen}>
          <DialogContent showCloseButton={false} className="w-[94vw] sm:w-full max-w-md p-6 rounded-2xl shadow-xl border border-border bg-card">
            <DialogHeader className="space-y-1.5 text-left pb-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Update Linked Weighment Trip?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    This entry is part of an active 2-entry weighment cycle.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Trip Connection Context Card */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Scale className="h-3.5 w-3.5 text-primary" />
                  <span>Weighment #{formState.linkedWeighment.id}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-2xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/60">
                  <span>Entry #{props.item ? String(getField(props.item, props.primaryIdKey)) : ""}</span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span>Entry #{formState.linkedWeighment.partner_entry_id}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="text-muted-foreground text-[11px] font-medium">Plate Change</span>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="line-through text-muted-foreground/70 bg-muted px-2 py-0.5 rounded border border-border/60">
                    {props.item ? String(getField(props.item, "vehicle_number") || "—") : "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {String(formState.pendingValues?.["vehicle_number"] || "")}
                  </span>
                </div>
              </div>
            </div>

            {/* Decision Choices */}
            <div className="space-y-2.5 pt-1">
              <p className="text-xs font-medium text-muted-foreground">How would you like to apply this plate update?</p>

              {/* Option 1: Update Both Entries (Recommended) */}
              <button
                type="button"
                onClick={() => formState.handleConfirmTripChoice(true)}
                className="group w-full text-left p-3.5 rounded-xl border border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.08] hover:border-primary transition-all duration-150 flex items-start gap-3 cursor-pointer"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs group-hover:scale-105 transition-transform">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Update Both Entries
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      Recommended
                    </span>
                  </div>
                  <p className="text-2xs text-muted-foreground leading-relaxed">
                    Applies <span className="font-mono font-medium text-foreground">{String(formState.pendingValues?.["vehicle_number"] || "")}</span> to both entries. Weighment #{formState.linkedWeighment.id} stays linked and active.
                  </p>
                </div>
              </button>

              {/* Option 2: Update Only This Entry */}
              <button
                type="button"
                onClick={() => formState.handleConfirmTripChoice(false)}
                className="group w-full text-left p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/60 hover:border-amber-500/50 transition-all duration-150 flex items-start gap-3 cursor-pointer"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Unlink className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Only This Entry
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Unlinks Trip
                    </span>
                  </div>
                  <p className="text-2xs text-muted-foreground leading-relaxed">
                    Updates this entry only. Weighment #{formState.linkedWeighment.id} will be cleanly disbanded because the two entries will have different plates.
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <DialogFooter className="bg-transparent border-t-0 p-0 pt-2 flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formState.setTripModalOpen(false)}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
