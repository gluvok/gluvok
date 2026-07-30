/**
 * @file lib/tenant/workspace.ts
 * @description Extracts the workspace identifier from a request's subdomain.
 *
 * Routing convention:
 *   neon.gluvok.com       → workspace = "neon"   → TenantMode.DEDICATED
 *   timescale.gluvok.com  → workspace = "timescale" → TenantMode.DEDICATED
 *   gluvok.com            → workspace = null      → TenantMode.SHARED
 *   localhost / dev       → workspace = null      → TenantMode.SHARED
 */

import type { NextRequest } from "next/server"

/** Labels that should be treated as the root (not a workspace). */
const IGNORED_SUBDOMAINS = new Set(["www", "api", ""])

/**
 * Returns the first subdomain label if it identifies a workspace, or null
 * for the root domain and local dev.
 *
 * Examples:
 *   "neon.gluvok.com"      → "neon"
 *   "gluvok.com"           → null
 *   "localhost"            → null
 *   "neon.localhost"       → "neon"  (when APP_DOMAIN=localhost)
 */
export function getWorkspace(req: NextRequest): string | null {
  const rootDomain = process.env.APP_DOMAIN ?? ""
  const hostname = req.headers.get("host") ?? req.nextUrl.hostname

  // Strip port
  const host = hostname.split(":")[0]

  // In dev when no APP_DOMAIN is set, always use shared
  if (!rootDomain) return null

  if (host === rootDomain) return null
  if (!host.endsWith(`.${rootDomain}`)) return null

  const sub = host.slice(0, host.length - rootDomain.length - 1) // remove ".gluvok.com"
  if (IGNORED_SUBDOMAINS.has(sub)) return null

  return sub || null
}
