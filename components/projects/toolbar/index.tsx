"use client";

/**
 * @file components/projects/toolbar/index.tsx
 * @description Toolbar section displayed above the table grid, housing search, total records badge, collapsible filter bar with active chips, reload button, view controls, and action buttons.
 */

import * as React from "react";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Search, Plus, RotateCw, X, SlidersHorizontal } from "lucide-react";
import { DataTableViewOptions } from "@/components/data-table";
import { BulkActions } from "./bulk-actions";
import { ProjectFilters, hasProjectFilters } from "@/components/projects/filters";
import { useAuthStore, getPermissions } from "@/lib/store";
import { type EntityRecord } from "@/types";

interface ProjectToolbarProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
  projectSlug: string;
  projectName: string;
  primaryIdKey: string;
  setCreating: (open: boolean) => void;
  onReload: () => void;
  showFilters?: boolean;
  setShowFilters?: (show: boolean | ((prev: boolean) => boolean)) => void;
}

function formatFilterChipLabel(id: string, value: unknown): string {
  const valStr = String(value);
  const formattedId = id
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "")
    .trim();
  const capitalizedId = formattedId.charAt(0).toUpperCase() + formattedId.slice(1);

  if (id === "auto_approve" || id === "auto_approved") {
    return `Auto Approve: ${valStr === "true" ? "Enabled" : "Disabled"}`;
  }
  if (id === "edited") {
    return `Edit: ${valStr === "true" ? "Edited" : "Original"}`;
  }
  if (id === "created_at" && typeof value === "object" && value !== null) {
    return "Date: Custom Range";
  }
  return `${capitalizedId}: ${valStr}`;
}

export function ProjectToolbar<TData extends RowData>({
  table,
  projectSlug,
  projectName,
  primaryIdKey,
  setCreating,
  onReload,
  showFilters: controlledShowFilters,
  setShowFilters: controlledSetShowFilters,
}: ProjectToolbarProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const user = useAuthStore((state) => state.user);
  const permissions = getPermissions(user?.role, projectSlug);
  const canCreate = permissions.create;
  const hasFilters = Boolean(permissions.filter && hasProjectFilters(projectSlug));

  const columnFilters = table.state.columnFilters;
  const isFiltered = columnFilters.length > 0 || !!table.state.globalFilter;
  const activeFiltersCount = columnFilters.length;
  const totalCount = table.getRowCount?.() ?? table.getFilteredRowModel().rows.length;

  const [localShowFilters, setLocalShowFilters] = React.useState(true);
  const showFilters = controlledShowFilters ?? localShowFilters;
  const setShowFilters = controlledSetShowFilters ?? setLocalShowFilters;

  return (
    <div className="flex flex-col gap-2.5">
      {selectedRows.length > 0 ? (
        <BulkActions
          table={table as unknown as ReactTable<ProjectTableFeatures, EntityRecord>}
          projectSlug={projectSlug}
          projectName={projectName}
          primaryIdKey={primaryIdKey}
        />
      ) : (
        <>
          {/* Top Row: Search, Records Count, and Global Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="relative w-full sm:max-w-xs md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={`search-input-${projectSlug}`}
                  placeholder="Search..."
                  value={(table.state.globalFilter as string) ?? ""}
                  onChange={(event) => table.setGlobalFilter(event.target.value)}
                  className="pl-9 pr-4 h-9 text-xs bg-background border border-input focus-visible:ring-1 focus-visible:ring-primary/50 transition-shadow"
                />
              </div>
              <Badge
                variant="secondary"
                className="h-7 px-2.5 text-[11px] font-semibold text-muted-foreground bg-muted/50 border border-border/50 shrink-0 select-none hidden sm:inline-flex items-center gap-1"
                title="Total matching records"
              >
                <span>{totalCount.toLocaleString()}</span>
                <span className="font-normal opacity-80">
                  {totalCount === 1 ? "record" : "records"}
                </span>
              </Badge>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {hasFilters && (
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="h-9 gap-1.5 text-xs shadow-sm"
                  title={showFilters ? "Hide Filter Controls" : "Show Filter Controls"}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden xs:inline">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              )}
              {isFiltered && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    table.setColumnFilters([]);
                    table.setGlobalFilter("");
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors gap-1.5"
                  title="Clear all active filters and search"
                >
                  Clear all
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={onReload}
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 shadow-sm"
                title="Reload and Reset Data"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              {canCreate && (
                <Button
                  onClick={() => setCreating(true)}
                  size="sm"
                  className="h-9 gap-1.5 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              )}
              <DataTableViewOptions table={table} />
            </div>
          </div>

          {/* Active Filter Chips / Pills (Shown whenever filters are active) */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">Active:</span>
              {columnFilters.map((filter) => {
                const label = formatFilterChipLabel(filter.id, filter.value);
                return (
                  <Badge
                    key={filter.id}
                    variant="secondary"
                    className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-muted/80 hover:bg-muted text-foreground border border-border/60 transition-colors"
                  >
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        table.setColumnFilters((prev) => prev.filter((f) => f.id !== filter.id));
                      }}
                      className="h-3.5 w-3.5 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors"
                      title={`Remove ${filter.id} filter`}
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.setColumnFilters([])}
                className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors underline underline-offset-2"
              >
                Reset
              </Button>
            </div>
          )}

          {/* Collapsible Filter Panel */}
          {hasFilters && (
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent className="transition-all duration-200">
                <div className="pt-2 pb-1 border-t border-border/50 mt-0.5">
                  <ProjectFilters projectSlug={projectSlug} table={table} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}
