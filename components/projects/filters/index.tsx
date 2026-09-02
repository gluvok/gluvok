"use client";

/**
 * @file components/projects/filters/index.tsx
 * @description Dynamic filter router for each project entity slug.
 */

import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { ProjectSlug } from "@/lib/constants/enums";
import { CentersFilters } from "./centers";
import { EntriesFilters } from "./entries";
import { RatesFilters } from "./rates";
import { UsersFilters } from "./users";
import { WeighmentsFilters } from "./weighments";
import { TicketsFilters } from "./tickets";

export * from "./common";
export * from "./centers";
export * from "./entries";
export * from "./rates";
export * from "./users";
export * from "./weighments";
export * from "./tickets";
export * from "./date-range-filter";

export function hasProjectFilters(slug: string): boolean {
  return (
    slug === ProjectSlug.CENTERS ||
    slug === ProjectSlug.ENTRIES ||
    slug === ProjectSlug.RATES ||
    slug === ProjectSlug.USERS ||
    slug === ProjectSlug.WEIGHMENTS ||
    slug === ProjectSlug.TICKETS
  );
}

interface ProjectFiltersProps<TData extends RowData> {
  projectSlug: string;
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function ProjectFilters<TData extends RowData>({
  projectSlug,
  table,
}: ProjectFiltersProps<TData>) {
  switch (projectSlug) {
    case ProjectSlug.CENTERS:
      return <CentersFilters table={table} />;
    case ProjectSlug.ENTRIES:
      return <EntriesFilters table={table} />;
    case ProjectSlug.RATES:
      return <RatesFilters table={table} />;
    case ProjectSlug.USERS:
      return <UsersFilters table={table} />;
    case ProjectSlug.WEIGHMENTS:
      return <WeighmentsFilters table={table} />;
    case ProjectSlug.TICKETS:
      return <TicketsFilters table={table} />;
    default:
      return null;
  }
}
