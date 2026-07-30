/**
 * @file lib/tenant/index.ts
 * @description Tenant resolver — maps a workspace name to a TenantContext
 * (mode + db URL). Caches postgres connection pools per URL so each dedicated
 * client reuses one pool across requests.
 */

import { TenantMode } from "@/lib/constants/enums"

export interface TenantContext {
  mode: TenantMode
  workspace: string | null // null = shared SaaS
  dbUrl: string
}

/**
 * Resolves which tenant mode and which database URL apply for a given workspace.
 *
 * Look-up order:
 *  1. workspace non-null  → check env var WORKSPACE_<NAME_UPPERCASED>
 *     found  → TenantMode.DEDICATED, use that URL
 *     absent → TenantMode.SHARED, fall through
 *  2. workspace null or env var missing → TenantMode.SHARED, use DATABASE_URL
 */
export function resolveTenant(workspace: string | null): TenantContext {
  if (workspace) {
    const envKey = `WORKSPACE_${workspace.toUpperCase().replace(/-/g, "_")}`
    const dedicatedUrl = process.env[envKey]
    if (dedicatedUrl) {
      return {
        mode: TenantMode.DEDICATED,
        workspace,
        dbUrl: dedicatedUrl,
      }
    }
  }

  const sharedUrl = process.env.DATABASE_URL
  if (!sharedUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  return {
    mode: TenantMode.SHARED,
    workspace: null,
    dbUrl: sharedUrl,
  }
}
