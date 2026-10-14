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
        <Badge variant="default" className="text-2xs font-normal">
          Admin
        </Badge>
      );
    case "manager":
      return (
        <Badge
          variant="outline"
          className="text-2xs font-normal text-blue-600 border-blue-200 dark:border-blue-900 dark:text-blue-400"
        >
          Manager
        </Badge>
      );
    case "operator":
      return (
        <Badge
          variant="outline"
          className="text-2xs font-normal text-emerald-600 border-emerald-200 dark:border-emerald-900 dark:text-emerald-400"
        >
          Operator
        </Badge>
      );
    case "base":
      return (
        <Badge variant="secondary" className="text-2xs font-normal">
          Base User
        </Badge>
      );
    case "hardware":
      return (
        <Badge
          variant="outline"
          className="text-2xs font-normal text-amber-600 border-amber-200 dark:border-amber-900 dark:text-amber-400"
        >
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

export const columns = columnHelper.columns([
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" icon={HashtagIcon} />,
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
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-foreground">
        {row.getValue("username")}
      </span>
    ),
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
  columnHelper.accessor("created_at", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" icon={Calendar01Icon} />
    ),
    cell: ({ row }) => {
      const dateVal = row.getValue("created_at") as string;
      const formatted = dateVal
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(dateVal))
        : "—";
      return <span className="text-xs text-muted-foreground">{formatted}</span>;
    },
    meta: {
      title: "Created At",
      icon: Calendar01Icon,
    },
  }),
  columnHelper.accessor("updated_at", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" icon={Clock01Icon} />
    ),
    cell: ({ row }) => {
      const dateVal = row.getValue("updated_at") as string;
      const formatted = dateVal
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(dateVal))
        : "—";
      return <span className="text-xs text-muted-foreground">{formatted}</span>;
    },
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
                  <span>Copy User ID</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.username)}>
                  <HugeiconsIcon icon={Copy01Icon} />
                  <span>Copy Username</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => meta?.onEditUser?.(user)}>
                  <HugeiconsIcon icon={Edit02Icon} />
                  <span>Edit User</span>
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => meta?.onDeleteUser?.(user)}>
                  <HugeiconsIcon icon={Delete02Icon} />
                  <span>Delete User</span>
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
]);
