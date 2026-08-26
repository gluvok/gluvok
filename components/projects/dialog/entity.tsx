"use client";

/**
 * @file components/projects/dialog/entity.tsx
 * @description Dialog modal wrapper for rendering entity creation or editing forms.
 */

import { type EntityRecord } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  );
}
