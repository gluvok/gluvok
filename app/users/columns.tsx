"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Calendar01Icon,
  Clock01Icon,
  Copy01Icon,
  CrownIcon,
  Delete02Icon,
  Edit02Icon,
  HashtagIcon,
  HeadsetIcon,
  MoreHorizontalIcon,
  SecurityCheckIcon,
  TextFontIcon,
  UserCheck01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "@/components/data-table/data-table-features";
import { type User, type UserRole } from "./types";

export interface UsersTableMeta {
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, User>();

function getRoleBadge(role: UserRole) {
  switch (role) {
    case "admin":
      return (
        <Badge
          variant="outline"
          className="gap-1 text-2xs font-normal text-zinc-800 border-zinc-300/80 bg-zinc-500/10 dark:text-zinc-200 dark:border-zinc-700/80 dark:bg-zinc-500/15"
        >
          <HugeiconsIcon icon={CrownIcon} className="size-3" />
          Admin
        </Badge>
      );
    case "manager":
      return (
        <Badge
          variant="outline"
          className="gap-1 text-2xs font-normal text-indigo-800 border-indigo-200/80 bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-900/40 dark:bg-indigo-950/30"
        >
          <HugeiconsIcon icon={Briefcase01Icon} className="size-3" />
          Manager
        </Badge>
      );
    case "operator":
      return (
        <Badge
          variant="outline"
          className="gap-1 text-2xs font-normal text-primary border-primary/30 bg-primary/10 dark:text-primary dark:border-primary/40 dark:bg-primary/15"
        >
          <HugeiconsIcon icon={HeadsetIcon} className="size-3" />
          Operator
        </Badge>
      );
    case "base":
      return (
        <Badge
          variant="outline"
          className="gap-1 text-2xs font-normal text-stone-700 border-stone-200/80 bg-stone-500/10 dark:text-stone-300 dark:border-stone-800/80 dark:bg-stone-900/30"
        >
          <HugeiconsIcon icon={UserIcon} className="size-3" />
          Base User
        </Badge>
      );
    case "customer":
      return (
        <Badge
          variant="outline"
          className="gap-1 text-2xs font-normal text-emerald-800 border-emerald-200/80 bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/30"
        >
          <HugeiconsIcon icon={UserCheck01Icon} className="size-3" />
          Customer
        </Badge>
      );
    case "hardware":
      return (
        <Badge
          variant="outline"
          className="gap-1 text-2xs font-normal text-amber-800 border-amber-300/80 bg-amber-500/10 dark:text-amber-300 dark:border-amber-900/40 dark:bg-amber-950/30"
        >
          <HugeiconsIcon icon={SecurityCheckIcon} className="size-3" />
          Hardware
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-2xs font-normal">
          {role}
        </Badge>
      );
  }
}

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
            cell: ({ row }) => getRoleBadge(row.getValue("role")),
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
