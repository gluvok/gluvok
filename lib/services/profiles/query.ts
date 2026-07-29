/**
 * @file lib/services/profiles/query.ts
 * @description Query definition and row mapping for the profiles entity.
 */

import { supabase } from "@/lib/supabase"
import { type Profile } from "@/types"

import { ProjectSlug, EntityKey } from "@/lib/constants/enums"

export const TABLE_NAME = ProjectSlug.PROFILES

export const SELECT_QUERY = `
  *,
  factory:${ProjectSlug.FACTORIES}(${EntityKey.NAME})
`

export const buildListQuery = () => supabase.from(TABLE_NAME).select(SELECT_QUERY)

export const buildPaginatedQuery = () => supabase.from(TABLE_NAME).select(SELECT_QUERY, { count: "exact" })

export function enrichProfile(item: {
  factory?: { name: string } | null
}): Profile {
  return {
    ...item,
    factory_name: item.factory?.name || "",
  } as Profile
}
