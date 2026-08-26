"use client";

/**
 * @file components/projects/filters/index.tsx
 * @description Dynamic filter router for each project entity slug.
 */

import { Table } from "@tanstack/react-table";
import { ProjectSlug } from "@/lib/constants/enums";
import { RatesFilters } from "./rates";
import { ProfilesFilters } from "./profiles";
import { WeighmentsFilters } from "./weighments";

interface ProjectFiltersProps<TData> {
  projectSlug: string;
  table: Table<TData>;
}

export function ProjectFilters<TData>({ projectSlug, table }: ProjectFiltersProps<TData>) {
  switch (projectSlug) {
    case ProjectSlug.RATES:
      return <RatesFilters table={table} />;
    case ProjectSlug.PROFILES:
      return <ProfilesFilters table={table} />;
    case ProjectSlug.WEIGHMENTS:
      return <WeighmentsFilters table={table} />;
    default:
      return null;
  }
}
