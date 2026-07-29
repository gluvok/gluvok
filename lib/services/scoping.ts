/**
 * @file lib/services/scoping.ts
 * @description Database service logic for CRUD operations of services.
 */

import { useAuthStore } from "@/lib/store/auth"
import { Role, EntityKey } from "@/lib/constants/enums"
import type { PostgrestFilterBuilder } from "@supabase/supabase-js"

interface MockSchema {
  Tables: {
    [key: string]: {
      Row: Record<string, unknown>
      Insert: Record<string, unknown>
      Update: Record<string, unknown>
      Relationships: never[]
    }
  }
  Views: {
    [key: string]: {
      Row: Record<string, unknown>
      Relationships: never[]
    }
  }
  Functions: {
    [key: string]: {
      Args: Record<string, unknown>
      Returns: unknown
    }
  }
}

export type AnyQuery<T extends Record<string, unknown>> = PostgrestFilterBuilder<
  { PostgrestVersion: string },
  MockSchema,
  T,
  T[]
>

export interface ScopingFilter {
  isSuperAdmin: boolean
  factoryId?: number
  userProfileId?: number
  customerId?: number
}

export interface PaginatedParams {
  page: number
  pageSize: number
  sortColumn?: string
  sortDesc?: boolean
  search?: string
  filters?: Record<string, unknown>
}

export async function getScopingFilter(): Promise<ScopingFilter | null> {
  const currentUser = useAuthStore.getState().user
  if (!currentUser) return null

  return {
    isSuperAdmin: currentUser.role === Role.SUPER_ADMIN,
    factoryId: currentUser.factory_id ? Number(currentUser.factory_id) : (currentUser.profile?.factory_id ? Number(currentUser.profile.factory_id) : undefined),
    userProfileId: currentUser.profile?.id ? Number(currentUser.profile.id) : undefined,
    customerId: currentUser.customer?.id ? Number(currentUser.customer.id) : undefined,
  }
}

export function applyPaginationAndSorting<T extends Record<string, unknown>>(
  query: AnyQuery<T>,
  params: PaginatedParams,
  sortMap: Record<string, string> = {},
  defaultSort: string = EntityKey.UPDATED_AT
): AnyQuery<T> {
  const { page, pageSize, sortColumn, sortDesc } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  const mappedSortColumn = sortColumn ? sortMap[sortColumn] || sortColumn : defaultSort
  const isAscending = sortColumn ? (sortDesc !== undefined ? !sortDesc : false) : false
  return query
    .order(mappedSortColumn, { ascending: isAscending })
    .range(from, to)
}

export function applyDateRangeFilter<T extends Record<string, unknown>>(
  query: AnyQuery<T>,
  filters?: Record<string, unknown>,
  dateColumn: string = EntityKey.CREATED_AT
): AnyQuery<T> {
  if (!filters) return query

  let q = query
  if (filters.start_date) {
    const startDate = new Date(filters.start_date as string)
    if (!isNaN(startDate.getTime())) {
      startDate.setHours(0, 0, 0, 0)
      q = q.gte(dateColumn as never, startDate.toISOString())
    }
  }

  if (filters.end_date) {
    const endDate = new Date(filters.end_date as string)
    if (!isNaN(endDate.getTime())) {
      endDate.setHours(23, 59, 59, 999)
      q = q.lte(dateColumn as never, endDate.toISOString())
    }
  }

  return q
}

export function applyColumnFilters<T extends Record<string, unknown>>(
  query: AnyQuery<T>,
  filters?: Record<string, unknown>,
  ignoredKeys: string[] = ["start_date", "end_date"]
): AnyQuery<T> {
  if (!filters) return query

  let q = query
  Object.entries(filters).forEach(([key, val]) => {
    if (!ignoredKeys.includes(key) && val !== undefined && val !== null && val !== "") {
      q = q.eq(key as never, val)
    }
  })
  return q
}

/**
 * Extract record IDs from query response and push Postgres `.in()` OR condition to conditions array
 */
export function addInCondition(
  orConditions: string[],
  key: string,
  data: Array<{ id: number }> | null | undefined
): void {
  if (!data || data.length === 0) return
  const ids = data.map((item) => item.id)
  if (ids.length > 0) {
    orConditions.push(`${key}.in.(${ids.join(",")})`)
  }
}

/**
 * Loop over multiple [key, queryResult] tuples to push Postgres `.in()` OR conditions
 */
export function addInConditions(
  orConditions: string[],
  items: Array<[string, { data?: Array<{ id: number }> | null } | Array<{ id: number }> | null | undefined]>
): void {
  for (const [key, raw] of items) {
    const data = Array.isArray(raw) ? raw : raw?.data
    addInCondition(orConditions, key, data)
  }
}

function checkError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function executeListQuery<T extends Record<string, unknown>>(
  query: AnyQuery<T>,
  defaultOrder: string = EntityKey.UPDATED_AT
): Promise<T[]> {
  const { data, error } = await query.order(defaultOrder, { ascending: false })
  checkError(error)
  return data || []
}

export async function executeSingleQuery<T extends Record<string, unknown>>(
  query: AnyQuery<T>,
  id: number
): Promise<T> {
  const { data, error } = await query.eq(EntityKey.ID as never, id).maybeSingle()
  checkError(error)
  if (!data) {
    throw new Error(`Record with ID ${id} not found`)
  }
  return data as T
}

export async function executePaginatedQuery<T extends Record<string, unknown>>(
  query: AnyQuery<T>
): Promise<{ data: T[]; count: number }> {
  const { data, count, error } = await query
  checkError(error)
  return { data: data || [], count: count || 0 }
}
