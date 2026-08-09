import { NextRequest, NextResponse } from "next/server"
import { StatusCodes, ReasonPhrases } from "http-status-codes"
import { verifyJWT, JWTPayload } from "@/lib/auth/jwt"
import {
  Role,
  RequestHeader,
  ProjectSlug,
  QueryParam,
  CookieName,
  TableName,
} from "@/lib/constants/enums"
export { hasPermission } from "@/lib/store/access"
import { REQUIRED_CREATE_FIELDS } from "@/lib/fields/config"
import { db, supabase } from "@/db"

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>
}

export { StatusCodes }

export function apiError(message: string, status: StatusCodes): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

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

export function forbiddenError(): NextResponse {
  return apiError(ReasonPhrases.FORBIDDEN, StatusCodes.FORBIDDEN)
}

export function getPaginationParams(url: URL): PaginationParams {
  const pageParam = url.searchParams.get(QueryParam.PAGE)
  const limitParam = url.searchParams.get(QueryParam.LIMIT)

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(limitParam || "10", 10) || 10))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

const PG_FK_VIOLATION = "23503"

export function isFKViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string }
  return e?.code === PG_FK_VIOLATION || Boolean(e?.message?.includes("foreign key"))
}

export function parseBulkIds(body: unknown): number[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { ids?: unknown }).ids)) {
    return null
  }

  const ids = (body as { ids: unknown[] }).ids
  if (ids.length === 0 || ids.length > 100) return null

  const numericIds = ids.map((id) => Number(id))
  if (!numericIds.every((id) => Number.isSafeInteger(id) && id > 0)) return null

  return [...new Set(numericIds)]
}

export async function getAuthUser(req: NextRequest | Request): Promise<JWTPayload | null> {
  const userId = req.headers.get(RequestHeader.USER_ID)
  const username = req.headers.get(RequestHeader.USERNAME)
  const role = req.headers.get(RequestHeader.ROLE)
  const factoryIdStr = req.headers.get(RequestHeader.FACTORY_ID)
  const profileIdStr = req.headers.get(RequestHeader.PROFILE_ID)

  if (userId && username && role) {
    return {
      sub: userId,
      username,
      role: role as Role,
      factory_id: factoryIdStr ? parseInt(factoryIdStr, 10) : null,
      profile_id: profileIdStr ? parseInt(profileIdStr, 10) : undefined,
    }
  }

  let token: string | undefined

  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    token =
      (req as NextRequest).cookies.get(CookieName.TOKEN)?.value ||
      (req as NextRequest).cookies.get(CookieName.AUTH_TOKEN)?.value
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

type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>
) => Promise<NextResponse>

type EntityIdHandler<P extends Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
  entityId: number
) => Promise<NextResponse>

type ScopedEntityHandler<P extends Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
  scope: { entityId: number; factoryId: number | null }
) => Promise<NextResponse>

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>,
  requiredRole?: Role
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<NextResponse> => {
    const { user, errorResponse } = await requireAuth(req, requiredRole)
    if (errorResponse) return errorResponse
    return handler(req, user, db, ctx)
  }
}

export function withEntityId<P extends Record<string, string> = Record<string, string>>(
  handler: EntityIdHandler<P>
): AuthedHandler<P> {
  return async (req, user, client, ctx) => {
    const { id } = await ctx.params
    const entityId = Number(id)
    if (!Number.isSafeInteger(entityId) || entityId <= 0) {
      return apiError("Invalid entity ID", StatusCodes.BAD_REQUEST)
    }

    return handler(req, user, client, ctx, entityId)
  }
}

export function withEntityScope<P extends Record<string, string> = Record<string, string>>(
  handler: ScopedEntityHandler<P>
): AuthedHandler<P> {
  return withEntityId(async (req, user, client, ctx, entityId) => {
    return handler(req, user, client, ctx, { entityId, factoryId: user.factory_id })
  })
}

export async function getFactory(
  client: typeof supabase,
  factoryId: number | null | undefined,
) {
  if (!factoryId) return null;
  try {
    const { data } = await client
      .from(TableName.FACTORIES)
      .select(
        "id, name, aadhar_number_mode, govt_id_mode, created_at, updated_at",
      )
      .eq("id", factoryId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      aadhar_number_mode: data.aadhar_number_mode,
      govt_id_mode: data.govt_id_mode,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return null;
  }
}

export interface SupabasePaginatedQuery {
  range: (
    start: number,
    end: number
  ) => PromiseLike<{
    data: unknown[] | null
    count: number | null
    error: { message?: string } | null
  }>
}

export async function fetchPaginatedResult<T = Record<string, unknown>>(
  query: SupabasePaginatedQuery,
  pagination: PaginationParams
) {
  const { page, limit, offset } = pagination
  const { data, count, error } = await query.range(offset, offset + limit - 1)
  if (error) {
    console.error("Supabase query error:", error)
    return apiError(error.message || "Database query failed", StatusCodes.INTERNAL_SERVER_ERROR)
  }
  const total = count ?? (data?.length || 0)
  return NextResponse.json({
    data: (data || []) as T[],
    pagination: { page, limit, total },
  })
}

export function formatEntityResponse<T extends Record<string, unknown>>(
  record: T,
  status: number = StatusCodes.OK
) {
  if (!record) return NextResponse.json({ data: null }, { status })
  const formatted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(record)) {
    if (key === "password_hash" || key === "passwordHash") {
      continue
    }
    formatted[key] = value
  }

  return NextResponse.json({ data: formatted }, { status })
}
