/**
 * @file components/projects/toolbar/index.tsx
 * @description Toolbar section displayed above the table grid, housing filters, search input, reload button, view controls, and action buttons.
 */

import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, RotateCw, X } from "lucide-react";
import { DataTableViewOptions } from "@/components/data-table";
import { BulkActions } from "./bulk-actions";
import { ProjectFilters } from "@/components/projects/filters";
import { ProjectSlug } from "@/lib/constants/enums";
import { useAuthStore, getPermissions } from "@/lib/store";

interface ProjectToolbarProps<TData> {
  table: Table<TData>;
  projectSlug: string;
  projectName: string;
  primaryIdKey: string;
  setCreating: (open: boolean) => void;
  onReload: () => void;
}

/**
 * ProjectToolbar Component
 * Renders search bar, reload, bulk actions (if rows selected), view options, and creation triggers based on user permissions.
 */
export function ProjectToolbar<TData>({
  table,
  projectSlug,
  projectName,
  primaryIdKey,
  setCreating,
  onReload,
}: ProjectToolbarProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const user = useAuthStore((state) => state.user);
  const permissions = getPermissions(user?.role, projectSlug);
  const isSettingsTable = projectSlug === ProjectSlug.SETTINGS;
  const hideAddForConfig = isSettingsTable && table.getPreFilteredRowModel().rows.length > 0;
  const canCreate = permissions.create && !hideAddForConfig;

  const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter;

  return (
    <div className="flex flex-col gap-3">
      {selectedRows.length > 0 ? (
        <BulkActions
          table={table}
          projectSlug={projectSlug}
          projectName={projectName}
          primaryIdKey={primaryIdKey}
        />
      ) : (
        <>
          {/* Top Row: Search and Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
            {!isSettingsTable && (
              <div className="relative w-full sm:max-w-xs md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={`search-input-${projectSlug}`}
                  placeholder="Search..."
                  value={(table.getState().globalFilter as string) ?? ""}
                  onChange={(event) => table.setGlobalFilter(event.target.value)}
                  className="pl-9 pr-4 h-9 text-xs bg-background border border-input focus-visible:ring-1 focus-visible:ring-primary/50 transition-shadow"
                />
              </div>
            )}

            <div
              className={`flex items-center gap-2 justify-end${isSettingsTable ? " self-end sm:ml-auto" : ""}`}
            >
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

          {/* Bottom Row: Filter Controls */}
          {!isSettingsTable && permissions.filter && (
            <ProjectFilters projectSlug={projectSlug} table={table} />
          )}
        </>
      )}
    </div>
  );
}
