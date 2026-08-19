/**
 * @file components/projects/columns/actions.tsx
 * @description Column definitions and rendering helpers for the Actions entity table.
 */

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getField } from "@/lib/store"
import { type EntityRecord } from "@/types"
import { type ColumnActionsCallbacks } from "./index"

import { type Permission, useAuthStore, type AuthUser } from "@/lib/store"
import { ProjectSlug, EntityKey, Role, WeighmentType } from "@/lib/constants/enums"

/**
 * hasRowModifyPermission
 * Helper function to determine if the currently logged-in user is authorized to
 * edit or delete a specific record based on RLS and RBAC rules.
 */
function hasRowModifyPermission(
  item: EntityRecord,
  projectSlug: string,
  currentUser: AuthUser | null
): boolean {
  if (!currentUser) return false


  switch (projectSlug) {
    case ProjectSlug.PROFILES: {
      const itemUserId = getField(item, EntityKey.USER_ID)
      const itemRole = getField(item, EntityKey.ROLE)

      const isOwnProfile = itemUserId === currentUser.id
      const isAdminOfFactory = currentUser.role === Role.ADMIN
      const isManagerOfFactory = currentUser.role === Role.MANAGER

      return (
        isOwnProfile ||
        (isAdminOfFactory && [Role.MANAGER, Role.OPERATOR, Role.BASE].includes(itemRole as Role)) ||
        (isManagerOfFactory && [Role.OPERATOR, Role.BASE].includes(itemRole as Role))
      )
    }



    default:
      return true
  }
}

interface ActionCellProps<T extends EntityRecord> {
  item: T
  projectSlug: string
  primaryIdKey: string
  callbacks: ColumnActionsCallbacks<T>
  canWrite: boolean
  canDelete: boolean
}

function ActionCell<T extends EntityRecord>({
  item,
  projectSlug,
  primaryIdKey,
  callbacks,
  canWrite,
  canDelete,
}: ActionCellProps<T>) {
  const itemId = String(getField(item, primaryIdKey))
  const currentUser = useAuthStore((state) => state.user)

  const canModifyRow = hasRowModifyPermission(item, projectSlug, currentUser)
  let hasRowWrite = canWrite && canModifyRow

  if (projectSlug === ProjectSlug.WEIGHMENTS) {
    const rateId = getField(item, EntityKey.RATE_ID)
    const typeVal = getField(item, EntityKey.TYPE)
    const isRateFixed = rateId !== null && rateId !== undefined && rateId !== ""
    const isTypeFixed = typeVal !== null && typeVal !== undefined && typeVal !== "" && typeVal !== WeighmentType.UNASSIGNED
    if (isRateFixed && isTypeFixed) {
      hasRowWrite = false
    }
  }

  const hasRowDelete = canDelete && canModifyRow

  return (
    <div className="text-right pr-4">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button id={`actions-trigger-${projectSlug}-${itemId}`} variant="ghost" className="h-8 w-8 p-0 hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Actions</DropdownMenuLabel>
          <DropdownMenuItem
            id={`actions-copy-${projectSlug}-${itemId}`} className="text-xs cursor-pointer gap-2 py-2"
            onClick={() => { navigator.clipboard.writeText(itemId); toast.success("Identifier copied to clipboard") }}
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copy ID
          </DropdownMenuItem>
          {hasRowWrite && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem id={`actions-edit-${projectSlug}-${itemId}`} className="text-xs cursor-pointer gap-2 py-2" onClick={() => callbacks.onEdit(item)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit
              </DropdownMenuItem>
            </>
          )}
          {hasRowDelete && (
            <>
              {!hasRowWrite && <DropdownMenuSeparator />}
              <DropdownMenuItem id={`actions-delete-${projectSlug}-${itemId}`} className="text-xs cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => callbacks.onDelete(item)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function getActionsColumn<T extends EntityRecord>(
  projectSlug: string,
  primaryIdKey: string,
  _projectName: string,
  callbacks: ColumnActionsCallbacks<T>,
  permissions?: Permission
): ColumnDef<T> {
  const canWrite = permissions?.write ?? true
  const canDelete = permissions?.delete ?? true

  return {
    id: "actions",
    cell: ({ row }) => (
      <ActionCell
        item={row.original}
        projectSlug={projectSlug}
        primaryIdKey={primaryIdKey}
        callbacks={callbacks}
        canWrite={canWrite}
        canDelete={canDelete}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableGlobalFilter: false,
  }
}
