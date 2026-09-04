"use client";

/**
 * @file components/projects/dialog/entity.tsx
 * @description Unified dialog modal wrapper for rendering entity creation, editing, viewing, and trip updates.
 */

import * as React from "react";
import { type EntityRecord } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogMode } from "@/lib/constants/enums";
import { useEntityForm } from "./use-entity-form";
import { EntityDialogContent } from "./entity-content";
import { TripDecisionContent } from "./trip-decision-content";

export interface EntityDialogProps {
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
 * When an entry edit requires trip disambiguation, transitions smoothly within the same dialog container.
 */
export function EntityDialog(props: EntityDialogProps) {
  const formState = useEntityForm(props);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      formState.setTripModalOpen(false);
    }
    props.onOpenChange(open);
  };

  const isShowingTripDecision = Boolean(formState.tripModalOpen && formState.linkedWeighment);

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {isShowingTripDecision && formState.linkedWeighment ? (
          <TripDecisionContent
            item={props.item}
            primaryIdKey={props.primaryIdKey}
            formState={formState}
          />
        ) : (
          <EntityDialogContent
            mode={props.mode}
            onOpenChange={props.onOpenChange}
            projectName={props.projectName}
            projectSlug={props.projectSlug}
            primaryIdKey={props.primaryIdKey}
            {...formState}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
