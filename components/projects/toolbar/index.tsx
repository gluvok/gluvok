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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Search,
  Plus,
  RotateCw,
  X,
  ListFilter,
  Calendar,
  Building,
  UserCog,
  Users,
  Tag,
  IndianRupee,
} from "lucide-react";
import { format } from "date-fns";
import { DataTableViewOptions } from "@/components/data-table";
import { BulkActions } from "./bulk-actions";
import { ProjectFilters, hasProjectFilters } from "@/components/projects/filters";
import { useAuthStore, getPermissions } from "@/lib/store";
import {
  getRoleIcon,
  getSourceIcon,
  getStatusIcon,
  getTypeIcon,
  getUnitIcon,
  getAutoApproveIcon,
} from "@/lib/fields";
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

function formatSafeDate(dateStr: string, dateFormat = "LLL dd, yyyy"): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, dateFormat);
  } catch {
    return dateStr;
  }
}

function formatFilterChipLabel(id: string, value: unknown): string {
  const valStr = String(value);
  if (id === "auto_approved") {
    return `Verification: ${valStr === "true" ? "System Approved" : "User Review"}`;
  }
  if (id === "auto_approve") {
    return `Auto Approve: ${valStr === "true" ? "Enabled" : "Disabled"}`;
  }
  if (id === "created_at" || id === "updated_at") {
    return `Date: ${formatSafeDate(valStr)}`;
  }
  if (id === "source" || id === "status" || id === "type") {
    return `${id.charAt(0).toUpperCase() + id.slice(1)}: ${valStr.charAt(0).toUpperCase() + valStr.slice(1)}`;
  }

  const formattedId = id
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "")
    .trim();
  const capitalizedId = formattedId
    ? formattedId.charAt(0).toUpperCase() + formattedId.slice(1)
    : id;

  if (valStr === "true") return `${capitalizedId}: Yes`;
  if (valStr === "false") return `${capitalizedId}: No`;
  return `${capitalizedId}: ${valStr}`;
}

function getFilterChipIcon(
  id: string,
  value?: unknown,
): React.ComponentType<{ className?: string }> {
  if (
    id === "date_range" ||
    id === "start_date" ||
    id === "end_date" ||
    id === "created_at" ||
    id === "updated_at"
  ) {
    return Calendar;
  }
  if (id === "center_id" || id === "center_name") {
    return Building;
  }
  if (
    id === "user_id" ||
    id === "user_name" ||
    id === "in_user_id" ||
    id === "in_user_name" ||
    id === "out_user_id" ||
    id === "out_user_name"
  ) {
    return UserCog;
  }
  if (id === "customer_id" || id === "customer_name") {
    return Users;
  }
  if (id === "commodity_id" || id === "commodity_name") {
    return Tag;
  }
  if (id === "rate_id") {
    return IndianRupee;
  }
  if (id === "role") {
    return getRoleIcon(String(value || ""));
  }
  if (id === "source") {
    return getSourceIcon(String(value || ""));
  }
  if (id === "status") {
    return getStatusIcon(String(value || ""));
  }
  if (id === "type") {
    return getTypeIcon(String(value || ""));
  }
  if (id === "unit") {
    return getUnitIcon(String(value || ""));
  }
  if (id === "auto_approved" || id === "auto_approve") {
    return getAutoApproveIcon(String(value || ""));
  }
  return ListFilter;
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
  const [internalShowFilters, setInternalShowFilters] = React.useState(true);
  const isControlled = controlledShowFilters !== undefined;
  const showFilters = isControlled ? controlledShowFilters : internalShowFilters;
  const setShowFilters = isControlled
    ? (val: boolean | ((prev: boolean) => boolean)) => {
        if (controlledSetShowFilters) {
          controlledSetShowFilters(val);
        }
      }
    : setInternalShowFilters;

  const permissions = useAuthStore((state) => getPermissions(state.user?.role, projectSlug));
  const canCreate = permissions.create;
  const hasFilters = hasProjectFilters(projectSlug);

  const selectedRows = table.getSelectedRowModel().rows;
  const columnFilters = table.state.columnFilters;
  const isFiltered = columnFilters.length > 0 || Boolean(table.state.globalFilter);
  const activeFiltersCount = columnFilters.length;
  const totalCount = table.getRowCount();

  return (
    <div className="flex flex-col gap-3">
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showFilters ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowFilters((prev) => !prev)}
                      className="h-9 gap-1.5 text-xs shadow-sm"
                      aria-label={showFilters ? "Hide Filter Controls" : "Show Filter Controls"}
                    >
                      <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="hidden xs:inline">Filters</span>
                      {activeFiltersCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{showFilters ? "Hide filters" : "Show filters"}</p>
                  </TooltipContent>
                </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onReload}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 shadow-sm"
                    aria-label="Reload"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Reload</p>
                </TooltipContent>
              </Tooltip>
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
          {activeFiltersCount > 0 &&
            (() => {
              const hasStartDate = columnFilters.find((f) => f.id === "start_date");
              const hasEndDate = columnFilters.find((f) => f.id === "end_date");
              const chips: {
                id: string;
                label: string;
                icon: React.ComponentType<{ className?: string }>;
                onRemove: () => void;
              }[] = [];

              if (hasStartDate && hasEndDate) {
                const fromStr = formatSafeDate(String(hasStartDate.value));
                const toStr = formatSafeDate(String(hasEndDate.value));
                chips.push({
                  id: "date_range",
                  label: `Date: ${fromStr} – ${toStr}`,
                  icon: Calendar,
                  onRemove: () => {
                    table.setColumnFilters((prev) =>
                      prev.filter((f) => f.id !== "start_date" && f.id !== "end_date"),
                    );
                  },
                });
              } else if (hasStartDate) {
                chips.push({
                  id: "start_date",
                  label: `From: ${formatSafeDate(String(hasStartDate.value))}`,
                  icon: Calendar,
                  onRemove: () => {
                    table.setColumnFilters((prev) => prev.filter((f) => f.id !== "start_date"));
                  },
                });
              } else if (hasEndDate) {
                chips.push({
                  id: "end_date",
                  label: `To: ${formatSafeDate(String(hasEndDate.value))}`,
                  icon: Calendar,
                  onRemove: () => {
                    table.setColumnFilters((prev) => prev.filter((f) => f.id !== "end_date"));
                  },
                });
              }

              for (const filter of columnFilters) {
                if (filter.id === "start_date" || filter.id === "end_date") {
                  continue;
                }
                chips.push({
                  id: filter.id,
                  label: formatFilterChipLabel(filter.id, filter.value),
                  icon: getFilterChipIcon(filter.id, filter.value),
                  onRemove: () => {
                    table.setColumnFilters((prev) => prev.filter((f) => f.id !== filter.id));
                  },
                });
              }

              return (
                <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">
                    Active:
                  </span>
                  {chips.map((chip) => {
                    const ChipIcon = chip.icon;
                    return (
                      <Badge
                        key={chip.id}
                        variant="secondary"
                        className="h-6 gap-1.5 pl-2 pr-1 text-[11px] font-medium bg-muted/80 hover:bg-muted text-foreground border border-border/60 transition-colors inline-flex items-center"
                      >
                        <ChipIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{chip.label}</span>
                        <button
                          type="button"
                          onClick={chip.onRemove}
                          className="h-3.5 w-3.5 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors ml-0.5"
                          title={`Remove ${chip.id} filter`}
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
              );
            })()}

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
