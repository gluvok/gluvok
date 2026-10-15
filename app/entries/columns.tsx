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
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  HashtagIcon,
  HeadsetIcon,
  Image01Icon,
  MoreHorizontalIcon,
  TruckIcon,
  UserIcon,
  ViewIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
import { type DataTableFeatures } from "@/components/data-table/data-table-features";
import { type Entry } from "./types";

export interface EntriesTableMeta {
  onViewDetails?: (entry: Entry) => void;
}

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
    cell: ({ row, table }) => {
      const entry = row.original;
      const meta = table.options.meta as EntriesTableMeta | undefined;
      const isMatch =
        entry.detected_vehicle_number &&
        entry.detected_vehicle_number.trim().toUpperCase() ===
          entry.vehicle_number.trim().toUpperCase();

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 font-mono text-xs font-semibold text-foreground hover:underline hover:bg-transparent"
            onClick={() => meta?.onViewDetails?.(entry)}
          >
            {entry.vehicle_number}
          </Button>
          {entry.detected_vehicle_number &&
            (isMatch ? (
              <Badge
                variant="outline"
                className="text-2xs py-0 px-1 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-2.5 mr-0.5" />
                ANPR
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-2xs py-0 px-1 border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              >
                Diff
              </Badge>
            ))}
        </div>
      );
    },
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
    enableSorting: false,
  }),
  columnHelper.accessor("customer_id", {
    id: "customer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" icon={UserIcon} />
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
      icon: UserIcon,
    },
    enableSorting: false,
  }),
  columnHelper.accessor("created_by", {
    id: "operator",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Operator" icon={HeadsetIcon} />
    ),
    cell: ({ row }) => {
      const operator = row.original.created_by_user;
      if (!operator) {
        return (
          <span className="text-2xs text-muted-foreground">User #{row.original.created_by}</span>
        );
      }
      return <span className="text-xs text-muted-foreground">{operator.name}</span>;
    },
    meta: {
      title: "Operator",
      icon: HeadsetIcon,
    },
    enableSorting: false,
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
  columnHelper.display({
    id: "actions",
    cell: ({ row, table }) => {
      const entry = row.original;
      const meta = table.options.meta as EntriesTableMeta | undefined;

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
                <DropdownMenuItem onClick={() => meta?.onViewDetails?.(entry)}>
                  <HugeiconsIcon icon={ViewIcon} />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
