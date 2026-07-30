/**
 * @file db/index.ts
 * @description Drizzle ORM database connection factory.
 *
 * - `getDb` — returns a cached Drizzle instance for the given DB URL + mode.
 * - `db`    — singleton for the shared (SaaS) database, reusing getDb.
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as sharedSchema from "./schema/shared"
import * as standaloneSchema from "./schema/standalone"
import { TenantMode } from "@/lib/constants/enums"
import type { TenantContext } from "@/lib/tenant"

// ─── Per-tenant connection pool cache ───────────────────────────────────────
const poolCache = new Map<string, ReturnType<typeof drizzle>>()

/**
 * Returns a cached Drizzle instance for the given tenant context.
 * Shared mode connections are keyed by URL; dedicated connections are keyed
 * by URL so each client reuses one pool across requests.
 */
export function getDb(ctx: TenantContext): ReturnType<typeof drizzle> {
  const cacheKey = ctx.dbUrl

  if (poolCache.has(cacheKey)) {
    return poolCache.get(cacheKey)!
  }

  const schema = ctx.mode === TenantMode.DEDICATED ? standaloneSchema : sharedSchema

  const client = postgres(ctx.dbUrl, {
    ssl: "require",
    prepare: false,
  })

  const instance = drizzle(client, { schema })
  poolCache.set(cacheKey, instance)
  return instance
}

// ─── Shared singleton (SaaS default) ────────────────────────────────────────
const sharedConnectionString = process.env.DATABASE_URL || ""

if (!sharedConnectionString) {
  console.warn("DATABASE_URL is missing from environment variables.")
}

export const db = getDb({
  mode: TenantMode.SHARED,
  workspace: null,
  dbUrl: sharedConnectionString,
})
