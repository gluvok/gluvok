/**
 * @file lib/services/scoping.ts
 * @description Shared types and utilities for paginated API service calls.
 */

export interface PaginatedParams {
  page: number
  pageSize: number
  sortColumn?: string
  sortDesc?: boolean
  search?: string
  filters?: Record<string, unknown>
}
