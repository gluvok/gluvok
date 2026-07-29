/**
 * @file components/projects/table/use-table.ts
 * @description Hook managing state (sorting, filters, pagination, column preferences, row selection) for dynamic tables.
 * Column visibility and filter preferences are persisted to localStorage via usePreferencesStore.
 */

import React from "react"
import { type EntityRecord } from "@/types"
import { ColumnDef, ColumnFiltersState, SortingState, VisibilityState, getCoreRowModel } from "@tanstack/react-table"
import { useReactTable } from "@/lib/utils"
import { getProjectColumns } from "@/components/projects/columns"
import { ProjectSlug, EntityKey } from "@/lib/constants/enums"
import { useProjectDialogStates, parseColumnFilters, areFiltersEqual, getVisibleColumnsList, isStringArrayEqual } from "./use-helpers"
import { useAuthStore, getPermissions, useEntitiesStore, usePreferencesStore } from "@/lib/store"
import { fetchEntityListPaginated } from "@/lib/services"

/** Stable empty object — avoids creating a new reference on every render in Zustand selectors */
const EMPTY_FILTERS: Record<string, unknown> = {}

/** Declarative map for entity-specific metadata pre-loading actions */
const ENTITY_METADATA_LOADERS: Partial<Record<ProjectSlug | string, (store: ReturnType<typeof useEntitiesStore.getState>) => void>> = {
  [ProjectSlug.WEIGHMENTS]: (store) => store.loadWeighmentFiltersData(),
  [ProjectSlug.RATES]: (store) => store.loadCommodities(),
  [ProjectSlug.CENTERS]: (store) => store.loadFactories(),
}

/** Computes initial or updated column visibility map based on saved preferences */
function computeColumnVisibility(columns: ColumnDef<EntityRecord>[], savedVisibleColumns?: string[]): VisibilityState {
  if (!savedVisibleColumns) return {}
  const visibility: VisibilityState = {}
  columns.forEach((col) => {
    const colId = col.id || ('accessorKey' in col ? String(col.accessorKey) : undefined)
    if (colId) {
      visibility[colId] = colId === "actions" || colId === "select" ? true : savedVisibleColumns.includes(colId)
    }
  })
  return visibility
}

interface UseProjectTableProps {
  projectSlug: string
  primaryIdKey: string
  projectName: string
}

/**
 * useProjectTable Hook
 * Manages queries, page indexes, column visibility states, and connects tables to TanStack Table instance.
 */
export function useProjectTable({
  projectSlug,
  primaryIdKey,
  projectName,
}: UseProjectTableProps) {
  const dialogStates = useProjectDialogStates()
  const user = useAuthStore((state) => state.user)

  // Preferences state & selectors from Zustand localStorage-backed store
  const savedFilters = usePreferencesStore((state) => state.filters[projectSlug] ?? EMPTY_FILTERS)
  const savedVisibleColumns = usePreferencesStore((state) => state.columns[projectSlug])
  const setColumnPreferences = usePreferencesStore((state) => state.setColumnPreferences)
  const setFilterPreferences = usePreferencesStore((state) => state.setFilterPreferences)

  // Local table controls state
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(() =>
    Object.entries(savedFilters).map(([id, value]) => ({ id, value }))
  )
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const { setEditingItem, setDeletingItem } = dialogStates

  // Sync initial saved filters when rehydrated
  const hasSyncedInitialFilters = React.useRef(Object.keys(savedFilters).length > 0)
  React.useEffect(() => {
    if (!hasSyncedInitialFilters.current && Object.keys(savedFilters).length > 0) {
      setColumnFilters(Object.entries(savedFilters).map(([id, value]) => ({ id, value })))
      hasSyncedInitialFilters.current = true
    }
  }, [savedFilters])

  // Persist filter changes to store
  React.useEffect(() => {
    const filtersObj = parseColumnFilters(columnFilters)
    if (!areFiltersEqual(filtersObj, savedFilters)) {
      setFilterPreferences(projectSlug, filtersObj)
    }
  }, [columnFilters, projectSlug, savedFilters, setFilterPreferences])

  // Table columns & permissions calculation
  const permissions = React.useMemo(() => getPermissions(user?.role, projectSlug), [user?.role, projectSlug])

  const columns = React.useMemo<ColumnDef<EntityRecord>[]>(() => {
    return getProjectColumns(projectSlug, primaryIdKey, projectName, {
      onEdit: setEditingItem,
      onDelete: setDeletingItem,
    }, permissions)
  }, [projectSlug, primaryIdKey, projectName, setEditingItem, setDeletingItem, permissions])

  // Column visibility state synchronization
  const initialColumnVisibility = React.useMemo(
    () => computeColumnVisibility(columns, savedVisibleColumns),
    [savedVisibleColumns, columns]
  )

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)
  const [prevSavedColumns, setPrevSavedColumns] = React.useState(savedVisibleColumns)

  if (savedVisibleColumns !== prevSavedColumns) {
    setPrevSavedColumns(savedVisibleColumns)
    setColumnVisibility(initialColumnVisibility)
  }

  // Data fetching & search debouncing
  const [localData, setLocalData] = React.useState<EntityRecord[]>([])
  const [localCount, setLocalCount] = React.useState(0)
  const [localLoading, setLocalLoading] = React.useState(true)
  const [debouncedFilter, setDebouncedFilter] = React.useState(globalFilter)

  const entitiesUpdatedTrigger = useEntitiesStore((state) => state.entitiesUpdatedTrigger)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilter(globalFilter)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)

    return () => clearTimeout(handler)
  }, [globalFilter])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLocalLoading(true)
        const filtersObj = parseColumnFilters(columnFilters)

        const result = await fetchEntityListPaginated(projectSlug as ProjectSlug, {
          page: pagination.pageIndex,
          pageSize: pagination.pageSize,
          sortColumn: sorting[0]?.id,
          sortDesc: sorting[0]?.desc,
          search: debouncedFilter,
          filters: filtersObj,
        })
        if (!cancelled) {
          setLocalData(result.data)
          setLocalCount(result.count)
        }
      } catch (err) {
        console.error(`Failed to load paginated ${projectSlug}:`, err)
      } finally {
        if (!cancelled) setLocalLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [projectSlug, pagination.pageIndex, pagination.pageSize, sorting, debouncedFilter, columnFilters, entitiesUpdatedTrigger])

  // TanStack Table Instance
  const table = useReactTable({
    data: localData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: undefined,
    getSortedRowModel: undefined,
    getFilteredRowModel: undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(localCount / pagination.pageSize),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },
  })

  // Persist column visibility changes to store
  React.useEffect(() => {
    const visibleColumnsList = getVisibleColumnsList(table)
    if (!isStringArrayEqual(savedVisibleColumns, visibleColumnsList)) {
      setColumnPreferences(projectSlug, visibleColumnsList)
    }
  }, [columnVisibility, projectSlug, savedVisibleColumns, table, setColumnPreferences])

  const handleReload = React.useCallback(() => {
    useEntitiesStore.getState().triggerEntitiesUpdate()
  }, [])

  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 0)
    return () => clearTimeout(timer)
  }, [])

  // Pre-load required entity dropdown/filter data
  // Skip loading if the factory filter is hidden for this role (e.g. CENTERS factory filter is hidden for non-super-admins)
  React.useEffect(() => {
    const loader = ENTITY_METADATA_LOADERS[projectSlug]
    if (!loader) return
    const isFactoryFilterHidden = permissions.hiddenFilters?.includes(EntityKey.FACTORY_ID)
    if (projectSlug === ProjectSlug.CENTERS && isFactoryFilterHidden) return
    loader(useEntitiesStore.getState())
  }, [projectSlug, permissions])

  return {
    table,
    isLoading: localLoading,
    isReady,
    permissions,
    handleReload,
    ...dialogStates,
  }
}

