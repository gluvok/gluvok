import { NextRequest, NextResponse } from "next/server"
import { StatusCodes, ReasonPhrases } from "http-status-codes"
import { verifyJWT, JWTPayload } from "@/lib/auth/jwt"
import { Role, RequestHeader } from "@/lib/constants/enums"

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

// ─── Pagination ───────────────────────────────────────────────────────────────
export function getPaginationParams(url: URL): PaginationParams {
  const pageParam = url.searchParams.get("page")
  const limitParam = url.searchParams.get("limit")

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

  if (userId && username && role && factoryIdStr) {
    return {
      sub: userId,
      username,
      role: role as Role,
      factory_id: parseInt(factoryIdStr, 10),
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

// ─── withAuth: HOF — declare role at the export site, not in the handler ─────
type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  ctx: RouteContext<P>
) => Promise<NextResponse>

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>,
  requiredRole?: Role
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<NextResponse> => {
    const { user, errorResponse } = await requireAuth(req, requiredRole)
    if (errorResponse) return errorResponse
    return handler(req, user, ctx)
  }
}
