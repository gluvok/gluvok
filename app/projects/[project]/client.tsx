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
import { useEntitiesStore, useConfigStore } from "@/lib/store"
import { ProjectSlug } from "@/lib/constants/enums"
import { type Config } from "@/types";
import { useProjectDialogStates } from "@/components/projects/table/use-helpers"

interface ProjectClientProps {
  projectName: string;
  projectSlug: string;
}

/** Settings page reads config directly from the Zustand config store — no DataTable, no paginated fetch */
function SettingsClient({ projectName, projectSlug }: ProjectClientProps) {
  const { config, configLoading, fetchConfig } = useConfigStore()
  const { creating, setCreating, editingItem, setEditingItem, deletingItem, setDeletingItem } = useProjectDialogStates()
  const primaryIdKey = getPrimaryIdKey(projectSlug)

  const configAsRecord = config
    ? {
        id: config.id,
        name: config.name,
        factory_name: config.factoryName,
        aadhar_number_mode: config.aadharNumberMode,
        govt_id_mode: config.govtIdMode,
      }
    : undefined

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center">
      <ConfigSummary
        config={configAsRecord as Config | undefined}
        isLoading={configLoading}
        error={null}
        canCreate={false}
        canEdit={!!config}
        onCreate={() => setCreating(true)}
        onEdit={setEditingItem}
        onRetry={fetchConfig}
      />
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
  )
}

function StandardProjectClient({ projectName, projectSlug }: ProjectClientProps) {
  const primaryIdKey = getPrimaryIdKey(projectSlug)
  const pt = useProjectTable({ projectSlug, primaryIdKey, projectName })
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
      <ProjectTable
        table={table}
        isLoading={isLoading}
        error={error}
        onRetry={handleReload}
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

/**
 * ProjectClient Component
 * Serves as the main orchestrator for a project's data management UI.
 */
export function ProjectClient({ projectName, projectSlug }: ProjectClientProps) {
  if (projectSlug === ProjectSlug.SETTINGS) {
    return <SettingsClient projectName={projectName} projectSlug={projectSlug} />
  }
  return <StandardProjectClient projectName={projectName} projectSlug={projectSlug} />
}
