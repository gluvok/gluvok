/**
 * @file lib/api-query.ts
 * @description Centralized, reusable API query utilities for pagination, multi-column sorting,
 * date range filtering, and standardized paginated response envelopes across route handlers.
 */

import { z } from "zod";

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface SortRule<T extends string = string> {
  col: T;
  ascending: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const dateQuerySchema = z
  .string()
  .trim()
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format",
  });

/**
 * Parses and validates pagination parameters from URL search params using Zod.
 * Clamps page to >= 1 and pageSize to [1, maxPageSize] (defaults to 10 and max 100).
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults?: { defaultPage?: number; defaultPageSize?: number; maxPageSize?: number },
): PaginationParams {
  const defaultPage = defaults?.defaultPage ?? 1;
  const defaultPageSize = defaults?.defaultPageSize ?? 10;
  const maxPageSize = defaults?.maxPageSize ?? 100;

  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("pageSize");

  const parsed = paginationQuerySchema.safeParse({
    page: rawPage || defaultPage,
    pageSize: rawPageSize || defaultPageSize,
  });

  const page = parsed.success ? Math.max(1, parsed.data.page) : defaultPage;
  const pageSize = parsed.success
    ? Math.max(1, Math.min(maxPageSize, parsed.data.pageSize))
    : defaultPageSize;

  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

/**
 * Parses multi-column sorting parameters from URL search params (e.g. "?sort=col1.asc,col2.desc").
 * Validates each requested column against an allowed whitelist and applies the default fallback if empty.
 */
export function parseSorting<T extends string>(
  searchParams: URLSearchParams,
  allowedColumns: readonly T[],
  defaultSort: SortRule<T> = { col: "id" as T, ascending: false },
): SortRule<T>[] {
  const requestedSort = searchParams.get("sort")?.trim();
  const sortRules: SortRule<T>[] = [];

  if (requestedSort) {
    const parts = requestedSort.split(",");
    for (const part of parts) {
      const [colName, dir] = part.split(/[.:]/);
      const trimmedCol = colName?.trim();
      if (allowedColumns.includes(trimmedCol as T)) {
        const isAsc = dir?.trim().toLowerCase() !== "desc";
        sortRules.push({
          col: trimmedCol as T,
          ascending: isAsc,
        });
      }
    }
  }

  if (sortRules.length === 0) {
    sortRules.push(defaultSort);
  }

  return sortRules;
}

/**
 * Applies optional 'from' and 'to' date range filters to a Supabase query with Zod validation.
 * 'to' date is normalized to end-of-day (23:59:59.999) for inclusive date matching.
 */
export function applyDateRange<
  TQuery extends {
    gte(col: string, val: string): TQuery;
    lte(col: string, val: string): TQuery;
  },
>(query: TQuery, searchParams: URLSearchParams, column = "created_at"): TQuery {
  let updated = query;
  const rawFrom = searchParams.get("from");
  if (rawFrom) {
    const parsed = dateQuerySchema.safeParse(rawFrom);
    if (parsed.success) {
      const fromDate = new Date(parsed.data);
      updated = updated.gte(column, fromDate.toISOString());
    }
  }

  const rawTo = searchParams.get("to");
  if (rawTo) {
    const parsed = dateQuerySchema.safeParse(rawTo);
    if (parsed.success) {
      const toDate = new Date(parsed.data);
      toDate.setHours(23, 59, 59, 999);
      updated = updated.lte(column, toDate.toISOString());
    }
  }

  return updated;
}

/**
 * Applies sequential sorting rules and range pagination slice to a Supabase query builder.
 */
export function applySortingAndPagination<
  TQuery extends {
    order(col: string, opts: { ascending: boolean }): TQuery;
    range(from: number, to: number): TQuery;
  },
>(query: TQuery, sortRules: readonly SortRule<string>[], pagination: PaginationParams): TQuery {
  let updated = query;
  for (const rule of sortRules) {
    updated = updated.order(rule.col, { ascending: rule.ascending });
  }
  return updated.range(pagination.offset, pagination.offset + pagination.pageSize - 1);
}

/**
 * Formats a standardized JSON response envelope with data and pagination metadata.
 */
export function formatPaginatedResponse<T>(
  data: T[] | null | undefined,
  count: number | null | undefined,
  pagination: PaginationParams,
): PaginatedResult<T> {
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  return {
    data: data ?? [],
    totalCount,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages,
  };
}
