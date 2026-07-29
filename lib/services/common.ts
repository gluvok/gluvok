/**
 * @file lib/services/common.ts
 * @description Service utilities for CRUD operations via backend API routes and axios.
 */

import axios from "axios"
import { ProjectSlug, ApiRoutes } from "@/lib/constants/enums"
import { type EntityRecord } from "@/types"
import { type PaginatedParams } from "./scoping"

const SLUG_TO_API_ROUTE: Record<ProjectSlug, ApiRoutes> = {
  [ProjectSlug.CENTERS]: ApiRoutes.CENTERS,
  [ProjectSlug.COMMODITIES]: ApiRoutes.COMMODITIES,
  [ProjectSlug.RATES]: ApiRoutes.RATES,
  [ProjectSlug.CUSTOMERS]: ApiRoutes.CUSTOMERS,
  [ProjectSlug.WEIGHMENTS]: ApiRoutes.WEIGHMENTS,
  [ProjectSlug.FACTORIES]: ApiRoutes.FACTORIES,
  [ProjectSlug.PROFILES]: ApiRoutes.PROFILES,
}

export function getEndpoint(slug: ProjectSlug): ApiRoutes {
  const endpoint = SLUG_TO_API_ROUTE[slug]
  if (!endpoint) throw new Error(`Unknown API route for slug: ${slug}`)
  return endpoint
}

export async function apiRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn()
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }
    throw error
  }
}

export async function fetchEntityListFromApi<T = EntityRecord>(slug: ProjectSlug): Promise<T[]> {
  const endpoint = getEndpoint(slug)
  return apiRequest(async () => {
    const res = await axios.get<{ data: T[] }>(endpoint)
    return res.data.data
  })
}

export async function fetchEntityPaginatedFromApi<T = EntityRecord>(
  slug: ProjectSlug,
  params: PaginatedParams
): Promise<{ data: T[]; count: number }> {
  const endpoint = getEndpoint(slug)
  const { page, pageSize, search, filters } = params
  return apiRequest(async () => {
    const res = await axios.get<{ data: T[]; pagination: { total: number } }>(endpoint, {
      params: { page: page + 1, limit: pageSize, search, ...filters },
    })
    return { data: res.data.data, count: res.data.pagination.total }
  })
}

export async function fetchEntityList(slug: ProjectSlug | string): Promise<EntityRecord[]> {
  return fetchEntityListFromApi(slug as ProjectSlug)
}

export async function fetchEntityListPaginated(
  slug: ProjectSlug,
  params: PaginatedParams
): Promise<{ data: EntityRecord[]; count: number }> {
  return fetchEntityPaginatedFromApi(slug, params)
}

// Mutate functions via Axios and API Routes with error message extraction
export async function insertRow(slug: ProjectSlug, record: Record<string, unknown>): Promise<EntityRecord> {
  const endpoint = getEndpoint(slug)
  return apiRequest(async () => {
    const res = await axios.post<{ data: EntityRecord }>(endpoint, record)
    return res.data.data
  })
}

export async function updateRow(slug: ProjectSlug, id: number, record: Record<string, unknown>): Promise<EntityRecord> {
  const endpoint = getEndpoint(slug)
  return apiRequest(async () => {
    const res = await axios.put<{ data: EntityRecord }>(`${endpoint}/${id}`, record)
    return res.data.data
  })
}

export async function deleteRow(slug: ProjectSlug, id: number): Promise<void> {
  const endpoint = getEndpoint(slug)
  return apiRequest(async () => {
    await axios.delete(`${endpoint}/${id}`)
  })
}
