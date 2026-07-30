"use client"

/**
 * @file app/projects/[project]/client.tsx
 * @description Client-side component for rendering a generic project dashboard interface.
 * Coordinates the toolbar, data table, pagination, and modals/dialogs for the selected project.
 */

import * as React from "react"
import { getPrimaryIdKey } from "@/lib/fields"
import { DataTablePagination } from "@/components/data-table"
import {
  ConfigSummary,
  ProjectToolbar,
  ProjectDialogs,
  ProjectTable,
  useProjectTable,
} from "@/components/projects";
import { Spinner } from "@/components/kibo-ui/spinner"
import { useEntitiesStore } from "@/lib/store"
import { ProjectSlug } from "@/lib/constants/enums"
import { type Config } from "@/types";

interface ProjectClientProps {
  projectName: string;
  projectSlug: string;
}

function StandardProjectClient({ projectName, projectSlug }: ProjectClientProps) {
  const primaryIdKey = getPrimaryIdKey(projectSlug)
  const pt = useProjectTable({ projectSlug, primaryIdKey, projectName })
  const {
    table,
    isLoading,
    isReady,
    permissions,
    creating,
    setCreating,
    editingItem,
    setEditingItem,
    deletingItem,
    setDeletingItem,
    handleReload,
  } = pt;
  const isConfigTable = projectSlug === ProjectSlug.CONFIGS;

  const isFiltersLoading = useEntitiesStore((state) => state.filtersLoading)

  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading && isReady && !isFiltersLoading) {
      const timer = setTimeout(() => {
        setHasLoadedOnce(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isLoading, isReady, isFiltersLoading])

  if (!isReady || !hasLoadedOnce) {
    return (
      <div className="min-h-96 flex flex-col items-center justify-center gap-3">
        <Spinner />
        <span className="text-xs font-medium text-muted-foreground/70">Loading {projectName.toLowerCase()}...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isConfigTable ? (
        <ConfigSummary
          config={table.getRowModel().rows[0]?.original as Config | undefined}
          isLoading={isLoading}
          canCreate={permissions.create}
          canEdit={permissions.write}
          onCreate={() => setCreating(true)}
          onEdit={setEditingItem}
        />
      ) : (
        <>
          {/* Search, filters, reload and creation controls */}
          <ProjectToolbar
            table={table}
            projectSlug={projectSlug}
            projectName={projectName}
            primaryIdKey={primaryIdKey}
            setCreating={setCreating}
            onReload={handleReload}
          />

          {/* Main data representation grid/table */}
          <ProjectTable table={table} isLoading={isLoading} />

          {/* Pagination controls */}
          {table.getRowModel().rows?.length > 0 && (
            <div className="pt-2">
              <DataTablePagination table={table} />
            </div>
          )}
        </>
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

/**
 * ProjectClient Component
 * Serves as the main orchestrator for a project's data management UI.
 */
export function ProjectClient({ projectName, projectSlug }: ProjectClientProps) {
  return <StandardProjectClient projectName={projectName} projectSlug={projectSlug} />
}
