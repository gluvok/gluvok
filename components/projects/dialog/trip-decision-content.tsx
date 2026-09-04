"use client";

/**
 * @file components/projects/dialog/trip-decision-content.tsx
 * @description View for resolving trip updates when an entry is linked with a partner entry in a weighment.
 */

import * as React from "react";
import { type EntityRecord } from "@/types";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, ArrowRight, Scale, Loader2, Save, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getField } from "@/lib/store";
import { type useEntityForm } from "./use-entity-form";

interface TripDecisionContentProps {
  item?: EntityRecord | null;
  primaryIdKey: string;
  formState: ReturnType<typeof useEntityForm>;
}

export function TripDecisionContent({ item, primaryIdKey, formState }: TripDecisionContentProps) {
  const [selectedChoice, setSelectedChoice] = React.useState<"both" | "single">("both");
  const [isSubmittingChoice, setIsSubmittingChoice] = React.useState(false);

  // Reset to recommended ("both") when trip modal opens
  React.useEffect(() => {
    if (formState.tripModalOpen) {
      setSelectedChoice("both");
      setIsSubmittingChoice(false);
    }
  }, [formState.tripModalOpen]);

  const linkedWeighment = formState.linkedWeighment;
  if (!linkedWeighment) return null;

  return (
    <>
      <DialogHeader className="space-y-1 text-left pb-0.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-3.5 w-3.5" />
          </div>
          <div>
            <DialogTitle className="text-sm font-semibold text-foreground">
              Update Linked Weighment Trip?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Entry #{item ? String(getField(item, primaryIdKey)) : ""} is paired with Entry #
              {linkedWeighment.partner_entry_id} in Weighment #{linkedWeighment.id}.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {/* Trip Context Card */}
      <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2 my-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">Weighment #{linkedWeighment.id}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-2xs text-muted-foreground">
            <span>Entry #{item ? String(getField(item, primaryIdKey)) : ""}</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />
            <span>Entry #{linkedWeighment.partner_entry_id}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
          <span className="text-muted-foreground text-2xs">Plate Update</span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="line-through text-muted-foreground/60">
              {item ? String(getField(item, "vehicle_number") || "—") : "—"}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
            <span className="font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-2xs border border-border/40">
              {String(formState.pendingValues?.["vehicle_number"] || "")}
            </span>
          </div>
        </div>
      </div>

      {/* Decision Choices */}
      <div className="space-y-2 pt-0.5">
        <p className="text-2xs font-medium text-muted-foreground">
          How would you like to apply this update?
        </p>

        {/* Option 1: Update Both Entries (Recommended) */}
        <button
          type="button"
          onClick={() => setSelectedChoice("both")}
          className={cn(
            "group w-full text-left p-3 rounded-lg border transition-all duration-150 flex items-start gap-2.5 cursor-pointer",
            selectedChoice === "both"
              ? "border-primary/40 bg-primary/[0.04]"
              : "border-border/50 bg-background hover:bg-muted/40 hover:border-border",
          )}
        >
          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
            <div
              className={cn(
                "h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-colors",
                selectedChoice === "both"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40",
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
              <span className="text-2xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                Recommended
              </span>
            </div>
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Applies{" "}
              <span className="font-mono text-foreground">
                {String(formState.pendingValues?.["vehicle_number"] || "")}
              </span>{" "}
              to both entries. Weighment #{linkedWeighment.id} stays linked.
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
              : "border-border/50 bg-background hover:bg-muted/40 hover:border-border",
          )}
        >
          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
            <div
              className={cn(
                "h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-colors",
                selectedChoice === "single"
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-muted-foreground/40",
              )}
            >
              {selectedChoice === "single" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
          </div>
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Only This Entry</span>
              <span className="text-2xs font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Unlinks Trip
              </span>
            </div>
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Updates this entry only. Weighment #{linkedWeighment.id} will be disbanded because
              plates differ.
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
          className="gap-1.5 h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Edit
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
          {isSubmittingChoice ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Confirm Update
        </Button>
      </DialogFooter>
    </>
  );
}
