"use client";

/**
 * @file app/projects/[project]/client.tsx
 * @description Client-side component for rendering a generic project dashboard interface.
 * Coordinates the toolbar, data table, pagination, and modals/dialogs for the selected project.
 */

import * as React from "react";
import { getPrimaryIdKey } from "@/lib/fields";
import { DataTablePagination } from "@/components/data-table";
import {
  ProjectToolbar,
  ProjectDialogs,
  ProjectTable,
  ProjectTitle,
  useProjectTable,
} from "@/components/projects";
import { hasProjectFilters, DateRangeFilter } from "@/components/projects/filters";
import { Spinner } from "@/components/kibo-ui/spinner";

interface ProjectClientProps {
  projectName: string;
  projectSlug: string;
  desc?: string;
}

export function ProjectClient({
  projectName,
  projectSlug,
  desc,
}: ProjectClientProps) {
  const primaryIdKey = getPrimaryIdKey(projectSlug);
  const pt = useProjectTable({ projectSlug, primaryIdKey, projectName });
  const {
    table,
    isLoading,
    error,
    isReady,
    creating,
    setCreating,
    editingItem,
    setEditingItem,
    deletingItem,
    setDeletingItem,
    handleReload,
  } = pt;

  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(true);
  const hasFilters = hasProjectFilters(projectSlug);
  const isFilterExpanded = hasFilters && showFilters;

  React.useEffect(() => {
    if (!isLoading && isReady) {
      const timer = setTimeout(() => {
        setHasLoadedOnce(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isReady]);

  if (!isReady || !hasLoadedOnce) {
    return (
      <div className="min-h-96 flex flex-col items-center justify-center gap-3">
        <Spinner />
        <span className="text-xs font-medium text-muted-foreground/70">
          Loading {projectName.toLowerCase()}...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Project Heading with Date Range Filter on the right */}
      <ProjectTitle
        projectName={projectName}
        projectSlug={projectSlug}
        desc={desc}
        actions={<DateRangeFilter table={table} />}
      />

      {/* Search, filters, reload and creation controls */}
      <ProjectToolbar
        table={table}
        projectSlug={projectSlug}
        projectName={projectName}
        primaryIdKey={primaryIdKey}
        setCreating={setCreating}
        onReload={handleReload}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />

      {/* Main data representation grid/table */}
      <ProjectTable
        table={table}
        isLoading={isLoading}
        error={error}
        onRetry={handleReload}
        hasFiltersExpanded={isFilterExpanded}
      />

      {/* Pagination controls */}
      {table.getRowModel().rows?.length > 0 && (
        <div className="pt-2">
          <DataTablePagination table={table} />
        </div>
      )}

      {/* Dialog overlays for CUD operations (Create, Update, Delete) */}
      <ProjectDialogs
        creating={creating}
        setCreating={setCreating}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        deletingItem={deletingItem}
        setDeletingItem={setDeletingItem}
        projectSlug={projectSlug}
        projectName={projectName}
        primaryIdKey={primaryIdKey}
      />
    </div>
  );
}
