"use client";

/**
 * @file components/projects/toolbar/bulk-actions.tsx
 * @description Toolbar helper rendering bulk actions (CSV/PDF export, delete confirmation) for selected rows.
 */

import * as React from "react";
import { type ReactTable } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Trash2, X, ChevronDown, FileText } from "lucide-react";
import { DeleteEntityDialog } from "@/components/projects/dialog/delete";
import { downloadCSV } from "@/lib/csv";
import { downloadPDF } from "@/lib/pdf";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { useAuthStore, getPermissions } from "@/lib/store";
import { type EntityRecord } from "@/types";

interface BulkActionsProps<TData extends EntityRecord = EntityRecord> {
  table: ReactTable<ProjectTableFeatures, TData>;
  projectSlug: string;
  projectName: string;
  primaryIdKey: string;
}

/**
 * BulkActions Component
 * Renders actions like download PDF/CSV and bulk delete when rows are selected in the table.
 */
export function BulkActions<TData extends EntityRecord = EntityRecord>({
  table,
  projectSlug,
  projectName,
  primaryIdKey,
}: BulkActionsProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const user = useAuthStore((state) => state.user);
  const companyName = user?.factory_name;
  const permissions = getPermissions(user?.role, projectSlug);
  const canDelete = permissions.delete;

  const handleDownloadPDF = async () => {
    await downloadPDF(table, projectName, undefined, undefined, projectSlug);
  };

  const handleDownloadCSV = () => {
    downloadCSV(table, projectName, companyName);
  };

  return (
    <div className="flex w-full items-center justify-between gap-3 px-4 py-2 bg-muted/50 rounded-lg border border-border/80 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-2xs font-bold text-primary animate-pulse">
          {selectedRows.length}
        </span>
        <span>
          {selectedRows.length} {selectedRows.length === 1 ? "row" : "rows"} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="export-options-trigger"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 font-medium border-border shadow-2xs hover:bg-muted"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              id="export-csv-btn"
              onClick={handleDownloadCSV}
              className="gap-2 text-xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              id="export-pdf-btn"
              onClick={handleDownloadPDF}
              className="gap-2 text-xs cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Export PDF Report</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {canDelete && (
          <Button
            id="bulk-delete-open-btn"
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
            className="h-8 text-xs gap-1.5 shadow-2xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Selected
          </Button>
        )}

        <Button
          id="clear-selection-btn"
          variant="ghost"
          size="sm"
          onClick={() => table.toggleAllRowsSelected(false)}
          className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Clear selection</span>
        </Button>
      </div>

      {open && (
        <DeleteEntityDialog
          open={open}
          onOpenChange={setOpen}
          projectSlug={projectSlug}
          projectName={projectName}
          primaryIdKey={primaryIdKey}
          items={selectedRows.map((r) => r.original)}
          onSuccess={() => table.toggleAllRowsSelected(false)}
        />
      )}
    </div>
  );
}
