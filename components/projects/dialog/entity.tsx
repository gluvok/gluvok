"use client";

/**
 * @file components/projects/dialog/entity.tsx
 * @description Dialog modal wrapper for rendering entity creation or editing forms.
 */

import * as React from "react";
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
import { Truck, ArrowRight, Scale, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [selectedChoice, setSelectedChoice] = React.useState<"both" | "single">("both");
  const [isSubmittingChoice, setIsSubmittingChoice] = React.useState(false);

  // Reset to recommended ("both") when trip modal opens
  React.useEffect(() => {
    if (formState.tripModalOpen) {
      setSelectedChoice("both");
      setIsSubmittingChoice(false);
    }
  }, [formState.tripModalOpen]);

  return (
    <>
      <Dialog
        open={props.open && !formState.tripModalOpen}
        onOpenChange={props.onOpenChange}
      >
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
          <DialogContent
            showCloseButton={false}
            className="w-[92vw] sm:w-full max-w-md p-5 pb-6 rounded-xl border border-border/60 bg-card shadow-lg"
          >
            <DialogHeader className="space-y-1 text-left pb-0.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-semibold text-foreground">
                    Update Linked Weighment Trip?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Entry #{props.item ? String(getField(props.item, props.primaryIdKey)) : ""} is paired with Entry #{formState.linkedWeighment.partner_entry_id} in Weighment #{formState.linkedWeighment.id}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Trip Context Card */}
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">Weighment #{formState.linkedWeighment.id}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <span>Entry #{props.item ? String(getField(props.item, props.primaryIdKey)) : ""}</span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />
                  <span>Entry #{formState.linkedWeighment.partner_entry_id}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                <span className="text-muted-foreground text-[11px]">Plate Update</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="line-through text-muted-foreground/60">
                    {props.item ? String(getField(props.item, "vehicle_number") || "—") : "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                  <span className="font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-[11px] border border-border/40">
                    {String(formState.pendingValues?.["vehicle_number"] || "")}
                  </span>
                </div>
              </div>
            </div>

            {/* Decision Choices */}
            <div className="space-y-2 pt-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">How would you like to apply this update?</p>

              {/* Option 1: Update Both Entries (Recommended) */}
              <button
                type="button"
                onClick={() => setSelectedChoice("both")}
                className={cn(
                  "group w-full text-left p-3 rounded-lg border transition-all duration-150 flex items-start gap-2.5 cursor-pointer",
                  selectedChoice === "both"
                    ? "border-primary/40 bg-primary/[0.04]"
                    : "border-border/50 bg-background hover:bg-muted/40 hover:border-border"
                )}
              >
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <div
                    className={cn(
                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-colors",
                      selectedChoice === "both"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {selectedChoice === "both" && (
                      <div className="h-1.5 w-1.5 rounded-full bg-background" />
                    )}
                  </div>
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Update Both Entries
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Applies <span className="font-mono text-foreground">{String(formState.pendingValues?.["vehicle_number"] || "")}</span> to both entries. Weighment #{formState.linkedWeighment.id} stays linked.
                  </p>
                </div>
              </button>

              {/* Option 2: Update Only This Entry */}
              <button
                type="button"
                onClick={() => setSelectedChoice("single")}
                className={cn(
                  "group w-full text-left p-3 rounded-lg border transition-all duration-150 flex items-start gap-2.5 cursor-pointer",
                  selectedChoice === "single"
                    ? "border-amber-500/40 bg-amber-500/[0.04]"
                    : "border-border/50 bg-background hover:bg-muted/40 hover:border-border"
                )}
              >
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <div
                    className={cn(
                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-colors",
                      selectedChoice === "single"
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {selectedChoice === "single" && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Only This Entry
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Unlinks Trip
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Updates this entry only. Weighment #{formState.linkedWeighment.id} will be disbanded because plates differ.
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <DialogFooter className="mx-0 mb-0 bg-transparent border-t-0 p-0 pt-4 flex flex-row items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formState.setTripModalOpen(false)}
                disabled={isSubmittingChoice}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setIsSubmittingChoice(true);
                  try {
                    await formState.handleConfirmTripChoice(selectedChoice === "both");
                  } finally {
                    setIsSubmittingChoice(false);
                  }
                }}
                disabled={isSubmittingChoice}
                className="gap-1.5 h-8 px-3.5 text-xs shadow-sm"
              >
                {isSubmittingChoice && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
