/**
 * @file components/data-table/features.ts
 * @description Centralized TanStack Table v9 features configuration and type definitions.
 */

import type * as React from "react";
import {
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  metaHelper,
  type Column,
  type ColumnDef,
  type RowData,
  type ReactTable,
} from "@tanstack/react-table";

export interface CustomColumnMeta {
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
}

export const projectTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  columnMeta: metaHelper<CustomColumnMeta>(),
});

export type ProjectTableFeatures = typeof projectTableFeatures;

export type AppTable<TData extends RowData = Record<string, unknown>> = ReactTable<
  ProjectTableFeatures,
  TData
>;
export type AppColumn<TData extends RowData = Record<string, unknown>, TValue = unknown> = Column<
  ProjectTableFeatures,
  TData,
  TValue
>;
export type AppColumnDef<
  TData extends RowData = Record<string, unknown>,
  TValue = unknown,
> = ColumnDef<ProjectTableFeatures, TData, TValue>;
