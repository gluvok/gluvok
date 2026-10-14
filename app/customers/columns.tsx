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
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Clock01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  HashtagIcon,
  MoreHorizontalIcon,
  TextFontIcon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "@/components/data-table/data-table-features";
import { type Customer } from "./types";

export interface CustomersTableMeta {
  onEditCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customer: Customer) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, Customer>();

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
  columnHelper.accessor("father_name", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Father's Name" icon={UserGroupIcon} />
    ),
    cell: ({ row }) => {
      const val = row.getValue("father_name") as string | null | undefined;
      return <span className="text-xs text-muted-foreground">{val || "—"}</span>;
    },
    meta: {
      title: "Father's Name",
      icon: UserGroupIcon,
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
      const customer = row.original;
      const meta = table.options.meta as CustomersTableMeta | undefined;

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
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(String(customer.id))}
                >
                  <HugeiconsIcon icon={Copy01Icon} />
                  <span>Copy Customer ID</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(customer.username)}>
                  <HugeiconsIcon icon={Copy01Icon} />
                  <span>Copy Username</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => meta?.onEditCustomer?.(customer)}>
                  <HugeiconsIcon icon={Edit02Icon} />
                  <span>Edit Customer</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => meta?.onDeleteCustomer?.(customer)}
                >
                  <HugeiconsIcon icon={Delete02Icon} />
                  <span>Delete Customer</span>
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
