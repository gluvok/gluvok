/**
 * @file lib/services/common.ts
 * @description Database service logic for CRUD operations of services using backend API routes and axios.
 */

import axios from "axios"
import { ProjectSlug, ApiRoutes } from "@/lib/constants/enums"
import { type EntityRecord } from "@/types"
import { fetchCenters, fetchCentersPaginated, fetchCenterById } from "./centers"
import { fetchCommodities, fetchCommoditiesPaginated, fetchCommodityById } from "./commodities"
import { fetchRates, fetchRatesPaginated, fetchRateById } from "./rates"
import { fetchCustomers, fetchCustomersPaginated, fetchCustomerById } from "./customers"
import { fetchWeighments, fetchWeighmentsPaginated, fetchWeighmentById } from "./weighments"
import { fetchFactories, fetchFactoriesPaginated, fetchFactoryById } from "./factories"
import { fetchProfiles, fetchProfilesPaginated, fetchProfileById } from "./profiles"
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

interface ServiceMethods {
  fetchSingle: (id: number) => Promise<EntityRecord>
  fetchList: () => Promise<EntityRecord[]>
  fetchPaginated: (params: PaginatedParams) => Promise<{ data: EntityRecord[]; count: number }>
}

/** Declarative registry mapping each entity ProjectSlug to its corresponding CRUD service handlers */
const ENTITY_SERVICES: Record<ProjectSlug, ServiceMethods> = {
  [ProjectSlug.CENTERS]: { fetchSingle: fetchCenterById, fetchList: fetchCenters, fetchPaginated: fetchCentersPaginated },
  [ProjectSlug.COMMODITIES]: { fetchSingle: fetchCommodityById, fetchList: fetchCommodities, fetchPaginated: fetchCommoditiesPaginated },
  [ProjectSlug.RATES]: { fetchSingle: fetchRateById, fetchList: fetchRates, fetchPaginated: fetchRatesPaginated },
  [ProjectSlug.CUSTOMERS]: { fetchSingle: fetchCustomerById, fetchList: fetchCustomers, fetchPaginated: fetchCustomersPaginated },
  [ProjectSlug.WEIGHMENTS]: { fetchSingle: fetchWeighmentById, fetchList: fetchWeighments, fetchPaginated: fetchWeighmentsPaginated },
  [ProjectSlug.FACTORIES]: { fetchSingle: fetchFactoryById, fetchList: fetchFactories, fetchPaginated: fetchFactoriesPaginated },
  [ProjectSlug.PROFILES]: { fetchSingle: fetchProfileById, fetchList: fetchProfiles, fetchPaginated: fetchProfilesPaginated },
}

export async function fetchSingleEntity(slug: ProjectSlug, id: number): Promise<EntityRecord> {
  const service = ENTITY_SERVICES[slug]
  if (!service) {
    throw new Error(`No fetch configured for single entity slug: ${slug}`)
  }
  return service.fetchSingle(id)
}

export async function fetchEntityList(slug: ProjectSlug | string): Promise<EntityRecord[]> {
  const service = ENTITY_SERVICES[slug as ProjectSlug]
  if (!service) {
    throw new Error(`Unknown project slug: ${slug}`)
  }
  return service.fetchList()
}

export async function fetchEntityListPaginated(
  slug: ProjectSlug,
  params: PaginatedParams
): Promise<{ data: EntityRecord[]; count: number }> {
  const service = ENTITY_SERVICES[slug]
  if (!service) {
    throw new Error(`Pagination not configured for slug: ${slug}`)
  }
  return service.fetchPaginated(params)
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
