/**
 * @file lib/services/common.ts
 * @description Service utilities for CRUD operations via backend API routes and axios.
 */

import axios from "axios";
import { ProjectSlug, ApiRoutes, QueryParam } from "@/lib/constants/enums";
import { type EntityRecord } from "@/types";
import { type PaginatedParams } from "./scoping";

const SLUG_TO_API_ROUTE: Record<ProjectSlug, ApiRoutes> = {
  [ProjectSlug.CENTERS]: ApiRoutes.CENTERS,
  [ProjectSlug.COMMODITIES]: ApiRoutes.COMMODITIES,
  [ProjectSlug.RATES]: ApiRoutes.RATES,
  [ProjectSlug.CUSTOMERS]: ApiRoutes.CUSTOMERS,
  [ProjectSlug.ENTRIES]: ApiRoutes.ENTRIES,
  [ProjectSlug.WEIGHMENTS]: ApiRoutes.WEIGHMENTS,
  [ProjectSlug.USERS]: ApiRoutes.USERS,
  [ProjectSlug.SETTINGS]: ApiRoutes.SETTINGS,
};

export function getEndpoint(slug: ProjectSlug): ApiRoutes {
  const endpoint = SLUG_TO_API_ROUTE[slug];
  if (!endpoint) throw new Error(`Unknown API route for slug: ${slug}`);
  return endpoint;
}

export async function apiRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn();
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function fetchEntityListFromApi<T = EntityRecord>(slug: ProjectSlug): Promise<T[]> {
  const endpoint = getEndpoint(slug);
  return apiRequest(async () => {
    const res = await axios.get<{ data: T[] }>(endpoint);
    return res.data.data;
  });
}

export async function fetchEntityPaginatedFromApi<T = EntityRecord>(
  slug: ProjectSlug,
  params: PaginatedParams,
): Promise<{ data: T[]; count: number }> {
  if (slug === ProjectSlug.SETTINGS) {
    throw new Error(
      `fetchEntityPaginatedFromApi should not be called for settings. Use the factory store instead.`,
    );
  }
  const endpoint = getEndpoint(slug);
  const { page, pageSize, search, filters, sortColumn, sortDesc } = params;
  return apiRequest(async () => {
    const res = await axios.get<{ data: T[]; pagination: { total: number } }>(endpoint, {
      params: {
        [QueryParam.PAGE]: page + 1,
        [QueryParam.LIMIT]: pageSize,
        [QueryParam.SEARCH]: search,
        [QueryParam.SORT_COLUMN]: sortColumn,
        [QueryParam.SORT_DESC]: sortDesc,
        ...filters,
      },
    });
    return { data: res.data.data || [], count: res.data.pagination.total };
  });
}

export async function fetchEntityList(slug: ProjectSlug | string): Promise<EntityRecord[]> {
  return fetchEntityListFromApi(slug as ProjectSlug);
}

export async function fetchEntityListPaginated(
  slug: ProjectSlug,
  params: PaginatedParams,
): Promise<{ data: EntityRecord[]; count: number }> {
  return fetchEntityPaginatedFromApi(slug, params);
}

export async function insertRow(
  slug: ProjectSlug,
  record: Record<string, unknown>,
): Promise<EntityRecord> {
  const endpoint = getEndpoint(slug);
  return apiRequest(async () => {
    const res = await axios.post<{ data: EntityRecord }>(endpoint, record);
    return res.data.data;
  });
}

export async function updateRow(
  slug: ProjectSlug,
  id: number,
  record: Record<string, unknown>,
): Promise<EntityRecord> {
  const endpoint = getEndpoint(slug);
  return apiRequest(async () => {
    // Settings has no meaningful [id] segment — the factory is scoped server-side via user.factory_id
    const url = slug === ProjectSlug.SETTINGS ? endpoint : `${endpoint}/${id}`;
    const res = await axios.patch<{ data: EntityRecord }>(url, record);
    return res.data.data;
  });
}

export async function deleteRow(slug: ProjectSlug, id: number): Promise<void> {
  const endpoint = getEndpoint(slug);
  return apiRequest(async () => {
    await axios.delete(`${endpoint}/${id}`);
  });
}

export async function deleteRows(slug: ProjectSlug, ids: number[]): Promise<number> {
  const endpoint = getEndpoint(slug);
  return apiRequest(async () => {
    const response = await axios.delete<{ deleted_count: number }>(endpoint, {
      data: { ids },
    });
    return response.data.deleted_count;
  });
}
