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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "@/components/data-table/data-table-features";
import { type Center } from "./types";

const columnHelper = createColumnHelper<DataTableFeatures, Center>();

export const columns = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor("id", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span>,
  }),
  columnHelper.accessor("name", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Center Name" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  }),
  columnHelper.accessor("auto_approve", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Auto Approve" />,
    cell: ({ row }) => {
      const autoApprove = row.getValue("auto_approve") as boolean;
      return (
        <Badge variant={autoApprove ? "default" : "secondary"}>
          {autoApprove ? "Enabled" : "Disabled"}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("created_at", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => {
      const dateVal = row.getValue("created_at") as string;
      const formatted = dateVal
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(dateVal))
        : "—";
      return <span className="text-muted-foreground">{formatted}</span>;
    },
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => {
      const center = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="size-7 p-0">
                <HugeiconsIcon icon={MoreHorizontalIcon} />
                <span className="sr-only">Open menu</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(center.id))}>
                <HugeiconsIcon icon={Copy01Icon} />
                <span>Copy Center ID</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(center.name)}>
                <HugeiconsIcon icon={Copy01Icon} />
                <span>Copy Center Name</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  }),
]);
