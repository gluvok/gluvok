"use client";

/**
 * @file components/projects/dialog/delete.tsx
 * @description Dialog modal wrapper for confirmation prompts when deleting entity records.
 */

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DeleteEntityDialogContent } from "./delete-content";
import { type DeleteEntityDialogProps } from "./types";

/**
 * DeleteEntityDialog Component
 * Renders the modal overlay container and embeds DeleteEntityDialogContent for handling delete actions.
 */
export function DeleteEntityDialog({
  open,
  onOpenChange,
  size = "default",
  ...props
}: DeleteEntityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`w-[92vw] sm:w-full ${size === "sm" ? "max-w-80 sm:max-w-80 p-5" : "max-w-100"}`}
      >
        <DeleteEntityDialogContent onOpenChange={onOpenChange} {...props} />
      </DialogContent>
    </Dialog>
  );
}
