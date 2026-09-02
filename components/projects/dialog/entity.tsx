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
import { Truck } from "lucide-react";
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
          <DialogContent showCloseButton={false} className="w-[92vw] sm:w-full max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                Update Linked Weighment Trip?
              </DialogTitle>
              <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground text-left">
                Entry{" "}
                <span className="font-semibold text-foreground">
                  #{props.item ? String(getField(props.item, props.primaryIdKey)) : ""}
                </span>{" "}
                is paired with Entry{" "}
                <span className="font-semibold text-foreground">
                  #{formState.linkedWeighment.partner_entry_id}
                </span>{" "}
                in Weighment{" "}
                <span className="font-semibold text-foreground">
                  #{formState.linkedWeighment.id}
                </span>
                .
                <br />
                <br />
                Would you like to update the vehicle number on <strong>both entries</strong> to keep
                the weighment trip linked, or only update this entry?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formState.setTripModalOpen(false)}
                className="w-full sm:w-auto h-8 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => formState.handleConfirmTripChoice(false)}
                className="w-full sm:w-auto h-8 px-3 text-xs"
              >
                Only This Entry
              </Button>
              <Button
                size="sm"
                onClick={() => formState.handleConfirmTripChoice(true)}
                className="w-full sm:w-auto h-8 px-3 text-xs gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                Update Both Entries
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
