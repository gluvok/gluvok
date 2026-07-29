/**
 * @file lib/store/access.ts
 * @description Role-based access control (RBAC) matrix and permission helper functions.
 */

import { Role, ProjectSlug, EntityKey } from "@/lib/constants/enums"

export interface Permission {
  /** Whether this role can query records from this entity table */
  read: boolean
  /** Whether this role can write/update records in this entity table */
  write: boolean
  /** Whether this role can delete records from this entity table */
  delete: boolean
  /** Whether this role can create new records in this entity table */
  create: boolean
  /** Whether this role should see this entity page in the dashboard/sidebar */
  show: boolean
  /** Whether this role can use filters in the table toolbar */
  filter: boolean
  /** List of hidden column keys for data tables. If undefined or empty, all columns are shown. */
  hiddenColumns?: string[]
  /** List of hidden field keys for add/edit form dialogs. If undefined or empty, all fields are shown. */
  hiddenFields?: string[]
  /** List of hidden filter keys in the table toolbar. If undefined or empty, all filters are shown. */
  hiddenFilters?: string[]
}

const NON_SUPER_ADMIN_FACTORY_COLUMNS = [EntityKey.FACTORY_ID, EntityKey.FACTORY_NAME]
const NON_SUPER_ADMIN_FACTORY_FIELDS = [EntityKey.FACTORY_ID]
const NON_SUPER_ADMIN_FACTORY_FILTERS = [EntityKey.FACTORY_ID]

export const RBAC_MATRIX: Record<Role, Record<ProjectSlug, Permission>> = {
  [Role.SUPER_ADMIN]: {
    [ProjectSlug.PROFILES]:    { read: true, write: true, delete: true,  create: true,  show: true, filter: true },
    [ProjectSlug.FACTORIES]:   { read: true, write: true, delete: true,  create: true,  show: true, filter: true },
    [ProjectSlug.CENTERS]:     { read: true, write: true, delete: true,  create: true,  show: true, filter: true },
    [ProjectSlug.COMMODITIES]: { read: true, write: true, delete: true,  create: true,  show: true, filter: true },
    [ProjectSlug.RATES]:       { read: true, write: true, delete: true,  create: true,  show: true, filter: true },
    [ProjectSlug.CUSTOMERS]:   { read: true, write: true, delete: true,  create: true,  show: true, filter: true },
    [ProjectSlug.WEIGHMENTS]:  { read: true, write: true, delete: true,  create: true,  show: true, filter: true },
  },
  [Role.ADMIN]: {
    [ProjectSlug.PROFILES]:    { read: true, write: true,  delete: true,  create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.FACTORIES]:   { read: true, write: true,  delete: true,  create: false, show: false, filter: false },
    [ProjectSlug.CENTERS]:     { read: true, write: true,  delete: true,  create: true,  show: true,  filter: false, hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.COMMODITIES]: { read: true, write: false, delete: false, create: false, show: true,  filter: true },
    [ProjectSlug.RATES]:       { read: true, write: true,  delete: true,  create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.CUSTOMERS]:   { read: true, write: true,  delete: true,  create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.WEIGHMENTS]:  { read: true, write: true,  delete: true,  create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
  },
  [Role.MANAGER]: {
    [ProjectSlug.PROFILES]:    { read: true, write: true,  delete: false, create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.FACTORIES]:   { read: true, write: false, delete: false, create: false, show: false, filter: false },
    [ProjectSlug.CENTERS]:     { read: true, write: false, delete: false, create: false, show: false, filter: false, hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.COMMODITIES]: { read: true, write: false, delete: false, create: false, show: false, filter: true },
    [ProjectSlug.RATES]:       { read: true, write: true,  delete: false, create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.CUSTOMERS]:   { read: true, write: true,  delete: false, create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.WEIGHMENTS]:  { read: true, write: true,  delete: false, create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
  },
  [Role.OPERATOR]: {
    [ProjectSlug.PROFILES]:    { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.FACTORIES]:   { read: true, write: false, delete: false, create: false, show: false, filter: false },
    [ProjectSlug.CENTERS]:     { read: true, write: false, delete: false, create: false, show: false, filter: false, hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.COMMODITIES]: { read: true, write: false, delete: false, create: false, show: false, filter: true },
    [ProjectSlug.RATES]:       { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.CUSTOMERS]:   { read: true, write: true,  delete: false, create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.WEIGHMENTS]:  { read: true, write: true,  delete: false, create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
  },
  [Role.BASE]: {
    [ProjectSlug.PROFILES]:    { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.FACTORIES]:   { read: true, write: false, delete: false, create: false, show: false, filter: false },
    [ProjectSlug.CENTERS]:     { read: true, write: false, delete: false, create: false, show: false, filter: false, hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.COMMODITIES]: { read: true, write: false, delete: false, create: false, show: false, filter: true },
    [ProjectSlug.RATES]:       { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.CUSTOMERS]:   { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.WEIGHMENTS]:  { read: true, write: false, delete: false, create: false, show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
  },
  [Role.HARDWARE]: {
    [ProjectSlug.PROFILES]:    { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.FACTORIES]:   { read: true, write: false, delete: false, create: false, show: false, filter: false },
    [ProjectSlug.CENTERS]:     { read: true, write: false, delete: false, create: false, show: false, filter: false, hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.COMMODITIES]: { read: true, write: false, delete: false, create: false, show: false, filter: true },
    [ProjectSlug.RATES]:       { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.CUSTOMERS]:   { read: true, write: false, delete: false, create: false, show: false, filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
    [ProjectSlug.WEIGHMENTS]:  { read: true, write: false, delete: false, create: true,  show: true,  filter: true,  hiddenColumns: NON_SUPER_ADMIN_FACTORY_COLUMNS, hiddenFields: NON_SUPER_ADMIN_FACTORY_FIELDS, hiddenFilters: NON_SUPER_ADMIN_FACTORY_FILTERS },
  },
}

export function getPermissions(role: Role | null | undefined, projectSlug: string): Permission {
  if (!role) {
    return { read: false, write: false, delete: false, create: false, show: false, filter: false }
  }
  return RBAC_MATRIX[role]?.[projectSlug as ProjectSlug] || { read: false, write: false, delete: false, create: false, show: false, filter: false }
}

/**
 * Whether this role should see this project page in the dashboard and sidebar.
 * Uses the `show` permission, which is distinct from `read` (DB query access)
 * and `write` (mutation access).
 */
export function hasPageAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).show
}

export function hasCreateAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).create
}

export function hasDeleteAccess(role: Role | null | undefined, projectSlug: string): boolean {
  return getPermissions(role, projectSlug).delete
}

export function isColumnVisible(role: Role | null | undefined, projectSlug: string, columnKey: string): boolean {
  const perms = getPermissions(role, projectSlug)
  if (!perms.hiddenColumns) return true
  return !perms.hiddenColumns.includes(columnKey)
}

export function isFieldVisible(role: Role | null | undefined, projectSlug: string, fieldKey: string): boolean {
  const perms = getPermissions(role, projectSlug)
  if (!perms.hiddenFields) return true
  return !perms.hiddenFields.includes(fieldKey)
}

export function isFilterVisible(role: Role | null | undefined, projectSlug: string, filterKey: string): boolean {
  const perms = getPermissions(role, projectSlug)
  if (!perms.hiddenFilters) return true
  return !perms.hiddenFilters.includes(filterKey)
}
