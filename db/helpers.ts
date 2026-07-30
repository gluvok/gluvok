import { NextRequest, NextResponse } from "next/server"
import { StatusCodes, ReasonPhrases } from "http-status-codes"
import { sql, eq, count, type Column, type SQL } from "drizzle-orm"
import { verifyJWT, JWTPayload } from "@/lib/auth/jwt"
import { Role, RequestHeader, TenantMode, ProjectSlug, PermissionKey, QueryParam } from "@/lib/constants/enums"
import { RBAC_MATRIX, type Permission } from "@/lib/store/access"
import { REQUIRED_CREATE_FIELDS } from "@/lib/fields/config"
import { db, getDb } from "@/db"
import { configs } from "@/db/schema"
import { getWorkspace } from "@/lib/tenant/workspace"
import { resolveTenant, type TenantContext } from "@/lib/tenant"

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

// ─── Typed route context (Next.js dynamic segments) ──────────────────────────
export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>
}

// ─── Re-export StatusCodes for convenience across API routes ─────────────────
export { StatusCodes }

// ─── apiError helper — no more raw numbers or "Unauthorized" strings ──────────
export function apiError(message: string, status: StatusCodes): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── Centralized Required Field Validation ────────────────────────────────────
export function validateRequiredFields(
  body: Record<string, unknown>,
  slug: ProjectSlug
): NextResponse | null {
  const requiredKeys = REQUIRED_CREATE_FIELDS[slug] || []
  const missing = requiredKeys.filter(
    (key) => body[key] === undefined || body[key] === null || body[key] === ""
  )
  if (missing.length > 0) {
    return apiError(
      `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`,
      StatusCodes.BAD_REQUEST
    )
  }
  return null
}


// ─── RBAC permission check ────────────────────────────────────────────────────
export function hasPermission(
  user: JWTPayload,
  slug: ProjectSlug,
  operation: PermissionKey
): boolean {
  const perms = RBAC_MATRIX[user.role as Role]?.[slug]
  return perms ? (perms[operation as keyof Permission] as boolean ?? false) : false
}

export function forbiddenError(): NextResponse {
  return apiError(ReasonPhrases.FORBIDDEN, StatusCodes.FORBIDDEN)
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function getPaginationParams(url: URL): PaginationParams {
  const pageParam = url.searchParams.get(QueryParam.PAGE)
  const limitParam = url.searchParams.get(QueryParam.LIMIT)

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(limitParam || "10", 10) || 10))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

// ─── FK constraint error catcher ─────────────────────────────────────────────
const PG_FK_VIOLATION = "23503"

export function isFKViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string }
  return e.code === PG_FK_VIOLATION || Boolean(e.message?.includes("foreign key"))
}

// ─── Auth: resolve user from proxy-forwarded headers or JWT cookie ────────────
export async function getAuthUser(req: NextRequest | Request): Promise<JWTPayload | null> {
  const userId = req.headers.get(RequestHeader.USER_ID)
  const username = req.headers.get(RequestHeader.USERNAME)
  const role = req.headers.get(RequestHeader.ROLE)
  const factoryIdStr = req.headers.get(RequestHeader.FACTORY_ID)
  const tenantModeHeader = req.headers.get(RequestHeader.TENANT_MODE)

  if (userId && username && role) {
    return {
      sub: userId,
      username,
      role: role as Role,
      factory_id: factoryIdStr ? parseInt(factoryIdStr, 10) : null,
      tenant_mode: tenantModeHeader === TenantMode.DEDICATED ? TenantMode.DEDICATED : TenantMode.SHARED,
    }
  }

  let token: string | undefined

  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    token =
      (req as NextRequest).cookies.get("token")?.value ||
      (req as NextRequest).cookies.get("auth_token")?.value
  }

  if (!token) {
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7)
    }
  }

  if (!token) return null
  return await verifyJWT(token)
}

// ─── requireAuth: call inline when you need the user object ──────────────────
export async function requireAuth(
  req: NextRequest | Request,
  requiredRole?: Role
): Promise<{ user: JWTPayload; errorResponse?: NextResponse }> {
  const user = await getAuthUser(req)
  if (!user) {
    return {
      user: null as never,
      errorResponse: apiError(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED),
    }
  }
  if (requiredRole && user.role !== requiredRole) {
    return {
      user,
      errorResponse: apiError(ReasonPhrases.FORBIDDEN, StatusCodes.FORBIDDEN),
    }
  }
  return { user }
}

// ─── withAuth: HOF — injects (req, user, db, mode, ctx) into every handler ──
type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  db: ReturnType<typeof getDb>,
  mode: TenantMode,
  ctx: RouteContext<P>
) => Promise<NextResponse>

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>,
  requiredRole?: Role
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<NextResponse> => {
    const { user, errorResponse } = await requireAuth(req, requiredRole)
    if (errorResponse) return errorResponse
    // Resolve tenant context from the request (subdomain → env var look-up)
    const workspace = getWorkspace(req)
    const tenant: TenantContext = resolveTenant(workspace)
    const tenantDb = getDb(tenant)
    return handler(req, user, tenantDb, tenant.mode, ctx)
  }
}
// ─── DB Session Context — set before queries so RLS policies can read them ────
// Call this inside withAuth handler (or any authed route) before DB queries.
// Uses SET LOCAL so values are scoped to the current transaction only.
export async function setDbSessionContext(
  user: JWTPayload,
  tenantDb: ReturnType<typeof getDb> = db
): Promise<void> {
  if (user.tenant_mode === TenantMode.DEDICATED) {
    await tenantDb.execute(sql`
      SELECT
        set_config('app.current_role',    ${user.role}, true),
        set_config('app.current_user_id', ${user.sub},  true)
    `)
  } else {
    await tenantDb.execute(sql`
      SELECT
        set_config('app.current_role',       ${user.role},              true),
        set_config('app.current_factory_id', ${String(user.factory_id)}, true),
        set_config('app.current_user_id',    ${user.sub},               true)
    `)
  }
}

/**
 * Reusable helper to fetch field requirement configuration.
 *
 * - Shared mode: looks up the config row for the given factoryId.
 * - Dedicated mode: always returns the single global config row.
 */
export async function getFactoryConfig(
  factoryId: number | null | undefined,
  tenantDb: ReturnType<typeof getDb> = db,
  mode: TenantMode = TenantMode.SHARED
) {
  try {
    if (mode === TenantMode.DEDICATED) {
      // Dedicated: single global config row, ignore factoryId
      const [c] = await tenantDb
        .select({
          aadharNumberMode: configs.aadharNumberMode,
          govtIdMode: configs.govtIdMode,
        })
        .from(configs)
        .limit(1)
      return c || null
    }
    if (!factoryId) return null
    const [c] = await tenantDb
      .select({
        factoryId: configs.factoryId,
        aadharNumberMode: configs.aadharNumberMode,
        govtIdMode: configs.govtIdMode,
      })
      .from(configs)
      .where(eq(configs.factoryId, factoryId))
      .limit(1)
    return c || null
  } catch {
    return null
  }
}

/**
 * Returns a factory scoping condition when in SHARED mode:
 * Scopes query strictly to user's assigned factory (`eq(factoryIdColumn, user.factory_id)`).
 */
export function getFactoryWhereClause(
  user: JWTPayload,
  mode: TenantMode,
  factoryIdColumn: Column
): SQL | undefined {
  if (mode === TenantMode.SHARED && user.factory_id != null) {
    return eq(factoryIdColumn, user.factory_id)
  }
  return undefined
}

/**
 * Executes count and data queries in parallel with pagination and returns a standardized JSON response.
 */
export async function fetchPaginatedResult<T = unknown>(
  tenantDb: ReturnType<typeof getDb>,
  countTableOrQuery: unknown,
  baseQuery: unknown,
  whereClause: SQL | undefined,
  pagination: PaginationParams,
  orderByClause?: unknown
) {
  const { page, limit, offset } = pagination
  const bQuery = baseQuery as {
    where: (clause: unknown) => {
      limit: (l: number) => {
        offset: (o: number) => {
          orderBy?: (ob: unknown) => Promise<unknown[]>
        } & Promise<unknown[]>
      }
    }
  }

  const limitedQuery = bQuery.where(whereClause).limit(limit).offset(offset)
  const dataQuery = orderByClause && typeof limitedQuery.orderBy === "function"
    ? limitedQuery.orderBy(orderByClause)
    : limitedQuery

  const cObj = countTableOrQuery as { where?: (w: unknown) => Promise<{ count: number | string }[]> }
  const countQuery = typeof cObj?.where === "function"
    ? cObj.where(whereClause)
    : (tenantDb as unknown as { select: (fields: unknown) => { from: (table: unknown) => { where: (clause: unknown) => Promise<{ count: number | string }[]> } } })
        .select({ count: count() })
        .from(countTableOrQuery)
        .where(whereClause)

  const [countResult, rows] = await Promise.all([
    countQuery,
    dataQuery,
  ])

  const total = Number((countResult as { count: number | string }[])[0]?.count || 0)
  return NextResponse.json({
    data: rows as T[],
    pagination: { page, limit, total },
  })
}

/**
 * Formats a DB entity record into standardized JSON API response:
 * - Converts camelCase DB fields (createdAt, fatherName) to snake_case (created_at, father_name)
 * - Omit sensitive internal fields (passwordHash)
 * - Conditionally includes factory_id based on TenantMode
 */
export function formatEntityResponse<T extends Record<string, unknown>>(
  record: T,
  mode: TenantMode = TenantMode.SHARED,
  status: number = StatusCodes.OK
) {
  const formatted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(record)) {
    if (key === "factoryId") {
      if (mode === TenantMode.SHARED && value != null) {
        formatted.factory_id = value
      }
    } else if (key === "passwordHash") {
      continue
    } else {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      formatted[snakeKey] = value
    }
  }

  return NextResponse.json({ data: formatted }, { status })
}
