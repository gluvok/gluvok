"use client"

/**
 * @file components/projects/filters/index.tsx
 * @description Dynamic filter router for each project entity slug.
 */

import { Table } from "@tanstack/react-table"
import { ProjectSlug } from "@/lib/constants/enums"
import { RatesFilters } from "./rates"
import { ProfilesFilters } from "./profiles"
import { WeighmentsFilters } from "./weighments"
import { CentersFilters } from "./centers"
import { ConfigsFilters } from "./configs"

interface ProjectFiltersProps<TData> {
  projectSlug: string
  table: Table<TData>
}

export function ProjectFilters<TData>({ projectSlug, table }: ProjectFiltersProps<TData>) {
  switch (projectSlug) {
    case ProjectSlug.RATES:
      return <RatesFilters table={table} />
    case ProjectSlug.PROFILES:
      return <ProfilesFilters table={table} />
    case ProjectSlug.WEIGHMENTS:
      return <WeighmentsFilters table={table} />
    case ProjectSlug.CENTERS:
      return <CentersFilters table={table} />
    case ProjectSlug.CONFIGS:
      return <ConfigsFilters table={table} />
    default:
      return null
  }
}
