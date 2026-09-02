/**
 * @file components/projects/dialog/delete-content.tsx
 * @description Dialog component or hook for managing delete content actions.
 */

"use client";

import { toast } from "sonner";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEntitiesStore, useAuthStore, getField, hasPermission } from "@/lib/store";
import { type DeleteContentProps } from "./types";
import { getSingularName } from "@/lib/utils";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";

export function DeleteEntityDialogContent({
  onOpenChange,
  projectSlug,
  projectName,
  primaryIdKey,
  item,
  items,
  onSuccess,
  customDisplayName,
  onConfirm,
}: DeleteContentProps) {
  const deleteEntity = useEntitiesStore((state) => state.deleteEntity);
  const deleteEntities = useEntitiesStore((state) => state.deleteEntities);
  const isBulk = !!items && items.length > 0;
  const count = items?.length || 0;
  const singularName = getSingularName(projectName || "Item");

  const onDeleteConfirm = async () => {
    try {
      const currentUser = useAuthStore.getState().user;

      if (projectSlug && !hasPermission(currentUser, projectSlug, PermissionKey.DELETE)) {
        toast.error("You do not have permission to delete this record.");
        onOpenChange(false);
        return;
      }

      const isSelfDeleted =
        projectSlug === ProjectSlug.USERS &&
        currentUser &&
        (isBulk
          ? items.some((it) => String(getField(it, primaryIdKey!)) === String(currentUser.id))
          : String(getField(item!, primaryIdKey!)) === String(currentUser.id));

      if (onConfirm) {
        await onConfirm();
      } else if (isBulk) {
        await deleteEntities(
          projectSlug as ProjectSlug,
          items.map((item) => getField(item, primaryIdKey!) as string | number),
        );
        if (!isSelfDeleted) {
          toast.success(`${projectName} records deleted successfully`);
        }
      } else {
        const idVal = getField(item!, primaryIdKey!);
        const primaryKeyValue = String(idVal || "");
        await deleteEntity(projectSlug as ProjectSlug, idVal as string | number);
        const singularName = getSingularName(projectName || "Item");
        if (!isSelfDeleted) {
          toast.success(`${singularName} "${primaryKeyValue}" deleted successfully`);
        }
      }

      onSuccess?.();
      onOpenChange(false);

      if (isSelfDeleted) {
        toast.success("Your account has been deleted. Logging out...");
        await useAuthStore.getState().logout();
      }
    } catch (err: unknown) {
      const pName = projectName || "Item";
      const singularName = getSingularName(pName);
      const errorMsg =
        err instanceof Error
          ? err.message
          : `Failed to delete ${isBulk ? pName.toLowerCase() : singularName.toLowerCase()}`;
      toast.error(errorMsg);
    }
  };

  const displayName =
    customDisplayName ||
    (isBulk ? `${count} selected items` : item ? `ID: ${getField(item, primaryIdKey!)}` : "");

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <div className="p-1.5 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          Delete {isBulk ? "Selected" : singularName}
        </DialogTitle>
        <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground text-left">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{displayName}</span>? This action cannot
          be undone.
        </DialogDescription>
      </DialogHeader>

      {projectSlug === ProjectSlug.WEIGHMENTS && (
        <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {isBulk
              ? "All corresponding linked entries will also be deleted."
              : (() => {
                  const inId = item ? getField(item, "in_entry_id") : undefined;
                  const outId = item ? getField(item, "out_entry_id") : undefined;
                  const linked: string[] = [];
                  if (inId) linked.push(`In Entry #${inId}`);
                  if (outId) linked.push(`Out Entry #${outId}`);
                  return linked.length > 0
                    ? `The linked entries (${linked.join(", ")}) will also be deleted.`
                    : "The corresponding linked entries will also be deleted.";
                })()}
          </span>
        </div>
      )}

      <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 mx-0 mb-0 flex flex-row items-center justify-end gap-3">
        <Button
          id="delete-entity-cancel"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="gap-1.5 h-8 px-3 text-xs"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button
          id="delete-entity-confirm"
          variant="destructive"
          size="sm"
          onClick={onDeleteConfirm}
          className="gap-1.5 h-8 px-3 text-xs shadow-sm"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </DialogFooter>
    </>
  );
}
