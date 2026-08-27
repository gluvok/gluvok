"use client";

/**
 * @file components/projects/toolbar/bulk-actions.tsx
 * @description Toolbar helper rendering bulk actions (CSV/PDF export, delete confirmation) for selected rows.
 */

import * as React from "react";
import { type RowData, type ReactTable } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, Trash2, X, ChevronDown, FileText } from "lucide-react";
import { DeleteEntityDialog } from "@/components/projects/dialog/delete";
import { downloadPDF, downloadCSV } from "@/lib/csv/exporter";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { useAuthStore, useFactoryStore, getPermissions } from "@/lib/store";

interface BulkActionsProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
  projectSlug: string;
  projectName: string;
  primaryIdKey: string;
}

/**
 * BulkActions Component
 * Renders actions like download PDF/CSV and bulk delete when rows are selected in the table.
 */
export function BulkActions<TData extends RowData>({
  table,
  projectSlug,
  projectName,
  primaryIdKey,
}: BulkActionsProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const user = useAuthStore((state) => state.user);
  const factory = useFactoryStore((state) => state.factory);
  const companyName = factory?.name;
  const permissions = getPermissions(user?.role, projectSlug);
  const canDelete = permissions.delete;

  const handleDownloadPDF = () => {
    downloadPDF(table, projectName, companyName);
  };

  const handleDownloadCSV = () => {
    downloadCSV(table, projectName, companyName);
  };

  return (
    <div className="flex w-full items-center justify-between gap-3 px-4 py-2 bg-muted/50 rounded-lg border border-border/80 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary animate-pulse">
          {selectedRows.length}
        </span>
        <span>selected</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetRowSelection()}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-background shadow-xs hover:bg-muted"
            >
              <FileDown className="h-3.5 w-3.5" />
              Download
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={handleDownloadCSV}
              className="text-xs cursor-pointer gap-2 py-2"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDownloadPDF}
              className="text-xs cursor-pointer gap-2 py-2"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
            className="h-8 gap-1.5 text-xs shadow-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Selected
          </Button>
        )}
        <DeleteEntityDialog
          open={open}
          onOpenChange={setOpen}
          projectSlug={projectSlug}
          projectName={projectName}
          primaryIdKey={primaryIdKey}
          items={selectedRows.map((r) => r.original as import("@/types").EntityRecord)}
          onSuccess={() => table.resetRowSelection()}
        />
      </div>
    </div>
  );
}
