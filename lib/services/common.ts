/**
 * @file lib/services/common.ts
 * @description Service utilities for CRUD operations via backend API routes and axios.
 */

import axios from "axios";
import { ProjectSlug } from "@/lib/constants/enums";
import { type EntityRecord } from "@/types";
import { type PaginatedParams } from "./scoping";
import { ApiErrorMessage } from "@/lib/constants/messages";

export function getEndpoint(slug: ProjectSlug | string): string {
  return `/api/${slug}`;
}

export async function apiRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn();
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const serverError = error.response?.data?.error || error.response?.data?.message;
      if (serverError && typeof serverError === "string") {
        throw new Error(serverError);
      }
      if (error.response?.status === 405) {
        throw new Error(ApiErrorMessage.METHOD_NOT_ALLOWED);
      }
      if (error.response?.status === 403) {
        throw new Error(ApiErrorMessage.FORBIDDEN);
      }
      if (error.response?.status === 404) {
        throw new Error(ApiErrorMessage.RECORD_NOT_FOUND);
      }
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
        page: page + 1,
        limit: pageSize,
        search: search,
        sort_column: sortColumn,
        sort_desc: sortDesc,
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
