"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { RoleBadge } from "@/components/role-badge";
import { formatDateTime } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Clock01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  HashtagIcon,
  MoreHorizontalIcon,
  SecurityCheckIcon,
  TextFontIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "@/components/data-table/data-table-features";
import { type User } from "./types";

export interface UsersTableMeta {
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, User>();

export function getColumns(options?: { showRole?: boolean; entityLabel?: string }) {
  const showRole = options?.showRole ?? true;
  const entityLabel = options?.entityLabel ?? "User";

  const allColumns = [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="size-4"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="size-4"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    columnHelper.accessor("id", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" icon={HashtagIcon} />
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span>,
      meta: {
        title: "ID",
        icon: HashtagIcon,
      },
    }),
    columnHelper.accessor("username", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Username" icon={TextFontIcon} />
      ),
      cell: ({ row }) => {
        const username = row.getValue("username") as string | null;
        if (!username) {
          return <span className="text-2xs text-muted-foreground italic">No portal account</span>;
        }
        return <span className="font-mono text-xs font-medium text-foreground">{username}</span>;
      },
      meta: {
        title: "Username",
        icon: TextFontIcon,
      },
    }),
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Full Name" icon={UserIcon} />
      ),
      cell: ({ row }) => <span className="text-xs font-medium">{row.getValue("name")}</span>,
      meta: {
        title: "Full Name",
        icon: UserIcon,
      },
    }),
    ...(showRole
      ? [
          columnHelper.accessor("role", {
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Role" icon={SecurityCheckIcon} />
            ),
            cell: ({ row }) => <RoleBadge role={row.getValue("role")} />,
            meta: {
              title: "Role",
              icon: SecurityCheckIcon,
            },
          }),
        ]
      : []),
    columnHelper.accessor("created_at", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" icon={Calendar01Icon} />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.getValue("created_at"))}
        </span>
      ),
      meta: {
        title: "Created At",
        icon: Calendar01Icon,
      },
    }),
    columnHelper.accessor("updated_at", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated At" icon={Clock01Icon} />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.getValue("updated_at"))}
        </span>
      ),
      meta: {
        title: "Updated At",
        icon: Clock01Icon,
      },
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row, table }) => {
        const user = row.original;
        const meta = table.options.meta as UsersTableMeta | undefined;

        return (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="size-7 p-0">
                    <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3.5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(user.id))}>
                    <HugeiconsIcon icon={Copy01Icon} />
                    <span>Copy {entityLabel} ID</span>
                  </DropdownMenuItem>
                  {user.username && (
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.username!)}>
                      <HugeiconsIcon icon={Copy01Icon} />
                      <span>Copy Username</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => meta?.onEditUser?.(user)}>
                    <HugeiconsIcon icon={Edit02Icon} />
                    <span>Edit {entityLabel}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => meta?.onDeleteUser?.(user)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} />
                    <span>Delete {entityLabel}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    }),
  ];

  return columnHelper.columns(allColumns);
}

export const columns = getColumns();
