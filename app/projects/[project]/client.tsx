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
  SettingsSummary,
  ProjectToolbar,
  ProjectDialogs,
  ProjectTable,
  useProjectTable,
} from "@/components/projects";
import { Spinner } from "@/components/kibo-ui/spinner"
import { useEntitiesStore, useFactoryStore } from "@/lib/store";
import { ProjectSlug } from "@/lib/constants/enums"
import { type Settings } from "@/types";
import { useProjectDialogStates } from "@/components/projects/table/use-helpers"

interface ProjectClientProps {
  projectName: string;
  projectSlug: string;
}

/** Settings page reads the active factory directly from the Zustand store. */
function SettingsClient({ projectName, projectSlug }: ProjectClientProps) {
  const { factory, factoryLoading, fetchFactory } = useFactoryStore();
  const { creating, setCreating, editingItem, setEditingItem, deletingItem, setDeletingItem } = useProjectDialogStates()
  const primaryIdKey = getPrimaryIdKey(projectSlug)

  React.useEffect(() => {
    fetchFactory();
  }, [fetchFactory]);

  const factoryAsRecord = factory
    ? {
        id: factory.id,
        name: factory.name,
        aadhar_number_mode: factory.aadhar_number_mode,
        govt_id_mode: factory.govt_id_mode,
      }
    : undefined;

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center">
      <SettingsSummary
        settings={factoryAsRecord as Settings | undefined}
        isLoading={factoryLoading}
        error={null}
        canCreate={false}
        canEdit={!!factory}
        onCreate={() => setCreating(true)}
        onEdit={setEditingItem}
        onRetry={fetchFactory}
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
  );
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
