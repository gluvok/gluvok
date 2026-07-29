/**
 * @file components/projects/dialog/delete-content.tsx
 * @description Dialog component or hook for managing delete content actions.
 */

"use client"

import { toast } from "sonner"
import { AlertTriangle, Trash2, X } from "lucide-react"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useEntitiesStore, getField } from "@/lib/store"
import { type DeleteContentProps } from "./types"
import { getSingularName } from "@/lib/utils"
import { ProjectSlug } from "@/lib/constants/enums"

export function DeleteEntityDialogContent({
  onOpenChange, projectSlug, projectName, primaryIdKey, item, items, onSuccess, customDisplayName, onConfirm
}: DeleteContentProps) {
  const deleteEntity = useEntitiesStore((state) => state.deleteEntity)
  const isBulk = !!items && items.length > 0
  const count = items?.length || 0
  const singularName = getSingularName(projectName || "Item")

  const onDeleteConfirm = async () => {
    try {
      if (onConfirm) {
        await onConfirm()
      } else if (isBulk) {
        await Promise.all(items.map(i => {
          const idVal = getField(i, primaryIdKey!)
          return deleteEntity(projectSlug as ProjectSlug, idVal as string | number)
        }))
        toast.success(`${projectName} records deleted successfully`)
      } else {
        const idVal = getField(item!, primaryIdKey!)
        const primaryKeyValue = String(idVal || "")
        await deleteEntity(projectSlug as ProjectSlug, idVal as string | number)
        const singularName = getSingularName(projectName || "Item")
        toast.success(`${singularName} "${primaryKeyValue}" deleted successfully`)
      }
      
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      const pName = projectName || "Item"
      const singularName = getSingularName(pName)
      const errorMsg = err instanceof Error ? err.message : `Failed to delete ${isBulk ? pName.toLowerCase() : singularName.toLowerCase()}`
      toast.error(errorMsg)
    }
  }

  const displayName = customDisplayName || (isBulk
    ? `${count} selected items`
    : item ? `ID: ${getField(item, primaryIdKey!)}` : "")

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <div className="p-1.5 rounded-lg bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
          Delete {isBulk ? "Selected" : singularName}
        </DialogTitle>
        <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground text-left">
          Are you sure you want to delete <span className="font-semibold text-foreground">{displayName}</span>? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 mx-0 mb-0 flex flex-row items-center justify-end gap-3">
        <Button id="delete-entity-cancel" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5 h-8 px-3 text-xs">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button id="delete-entity-confirm" variant="destructive" size="sm" onClick={onDeleteConfirm} className="gap-1.5 h-8 px-3 text-xs shadow-sm">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </DialogFooter>
    </>
  )
}
