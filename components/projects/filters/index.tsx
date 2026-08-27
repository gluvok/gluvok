"use client";

/**
 * @file components/projects/filters/index.tsx
 * @description Dynamic filter router for each project entity slug.
 */

import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { ProjectSlug } from "@/lib/constants/enums";
import { RatesFilters } from "./rates";
import { UsersFilters } from "./users";
import { WeighmentsFilters } from "./weighments";

interface ProjectFiltersProps<TData extends RowData> {
  projectSlug: string;
  table: ReactTable<ProjectTableFeatures, TData>;
}

export function ProjectFilters<TData extends RowData>({
  projectSlug,
  table,
}: ProjectFiltersProps<TData>) {
  switch (projectSlug) {
    case ProjectSlug.RATES:
      return <RatesFilters table={table} />;
    case ProjectSlug.USERS:
      return <UsersFilters table={table} />;
    case ProjectSlug.WEIGHMENTS:
      return <WeighmentsFilters table={table} />;
    default:
      return null;
  }
}
