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
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Calendar01Icon,
  Clock01Icon,
  Copy01Icon,
  CpuIcon,
  HashtagIcon,
  Image01Icon,
  MoreHorizontalIcon,
  TransmissionIcon,
  TruckIcon,
  UserGroupIcon,
  UserIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "@/components/data-table/data-table-features";
import { type Entry } from "./types";

const columnHelper = createColumnHelper<DataTableFeatures, Entry>();

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
  columnHelper.accessor("vehicle_number", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vehicle Number" icon={TruckIcon} />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-foreground">
        {row.original.vehicle_number}
      </span>
    ),
    meta: {
      title: "Vehicle Number",
      icon: TruckIcon,
    },
  }),
  columnHelper.accessor("weight", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Weight (kg)" icon={WeightScale01Icon} />
    ),
    cell: ({ row }) => {
      const weight = Number(row.getValue("weight"));
      return (
        <div className="flex items-baseline gap-1 font-mono text-xs">
          <span className="font-semibold text-foreground">{weight.toLocaleString()}</span>
          <span className="text-2xs text-muted-foreground">kg</span>
        </div>
      );
    },
    meta: {
      title: "Weight",
      icon: WeightScale01Icon,
    },
  }),
  columnHelper.accessor(
    (row) => (row.created_by_user?.role === "hardware" ? "Hardware" : "Manual"),
    {
      id: "source",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" icon={TransmissionIcon} />
      ),
      cell: ({ row }) => {
        const isHardware = row.original.created_by_user?.role === "hardware";
        return isHardware ? (
          <Badge
            variant="outline"
            className="border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400 gap-1 text-2xs font-medium"
          >
            <HugeiconsIcon icon={CpuIcon} className="size-3" />
            Hardware
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-stone-500/20 bg-stone-500/10 text-stone-600 dark:text-stone-400 gap-1 text-2xs font-medium"
          >
            <HugeiconsIcon icon={UserIcon} className="size-3" />
            Manual
          </Badge>
        );
      },
      meta: {
        title: "Source",
        icon: TransmissionIcon,
      },
      enableSorting: true,
    },
  ),
  columnHelper.accessor("center_id", {
    id: "center",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Center" icon={Building01Icon} />
    ),
    cell: ({ row }) => {
      const centerName = row.original.center?.name;
      if (!centerName) {
        return (
          <span className="text-2xs text-muted-foreground">Center #{row.original.center_id}</span>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs font-normal">
          {centerName}
        </Badge>
      );
    },
    meta: {
      title: "Center",
      icon: Building01Icon,
    },
    enableSorting: true,
  }),
  columnHelper.accessor("customer_id", {
    id: "customer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" icon={UserGroupIcon} />
    ),
    cell: ({ row }) => {
      const customer = row.original.customer;
      if (!customer) {
        return <span className="text-2xs text-muted-foreground italic">Unassigned</span>;
      }
      return <span className="text-xs font-medium text-foreground">{customer.name}</span>;
    },
    meta: {
      title: "Customer",
      icon: UserGroupIcon,
    },
    enableSorting: true,
  }),
  columnHelper.accessor("created_by", {
    id: "created_by",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created by" icon={UserIcon} />
    ),
    cell: ({ row }) => {
      const creator = row.original.created_by_user;
      if (!creator) {
        return (
          <span className="text-2xs text-muted-foreground">User #{row.original.created_by}</span>
        );
      }
      return <span className="text-xs text-muted-foreground">{creator.name}</span>;
    },
    meta: {
      title: "Created by",
      icon: UserIcon,
    },
    enableSorting: true,
  }),
  columnHelper.display({
    id: "images",
    header: "Photos",
    cell: ({ row }) => {
      const count = row.original.images?.length ?? 0;
      if (count === 0) {
        return <span className="text-2xs text-muted-foreground">0</span>;
      }
      return (
        <Badge variant="outline" className="text-2xs gap-1 py-0 px-1.5 text-muted-foreground">
          <HugeiconsIcon icon={Image01Icon} className="size-3" />
          <span>{count}</span>
        </Badge>
      );
    },
    meta: {
      title: "Photos",
      icon: Image01Icon,
    },
    enableSorting: false,
  }),
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
    enableSorting: true,
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => {
      const entry = row.original;

      const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.add({
          type: "success",
          title: "Copied to Clipboard",
          description: `${label} copied.`,
        });
      };

      return (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 p-0"
                  aria-label={`Actions for entry ${entry.id}`}
                  data-testid={`actions-entry-${entry.id}`}
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3.5" />
                  <span className="sr-only">Open actions menu</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Entry #{entry.id}</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleCopy(entry.vehicle_number, "Vehicle Number")}
                >
                  <HugeiconsIcon icon={Copy01Icon} />
                  <span>Copy Vehicle Number</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopy(String(entry.weight), "Weight")}>
                  <HugeiconsIcon icon={Copy01Icon} />
                  <span>Copy Weight</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopy(String(entry.id), "Entry ID")}>
                  <HugeiconsIcon icon={Copy01Icon} />
                  <span>Copy Entry ID</span>
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
