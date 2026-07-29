import { NextRequest, NextResponse } from "next/server"
import { verifyJWT, JWTPayload } from "@/lib/auth/jwt"
import { Role } from "@/lib/constants/enums"

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Extracts pagination parameters (page, limit, offset) from request URL search params.
 */
export function getPaginationParams(url: URL): PaginationParams {
  const pageParam = url.searchParams.get("page")
  const limitParam = url.searchParams.get("limit")

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(limitParam || "10", 10) || 10))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Extracts and resolves authenticated user from headers set by proxy.ts middleware
 * or falls back to JWT token verification.
 */
export async function getAuthUser(req: NextRequest | Request): Promise<JWTPayload | null> {
  const userId = req.headers.get("x-user-id")
  const username = req.headers.get("x-user-username")
  const role = req.headers.get("x-user-role")
  const factoryIdStr = req.headers.get("x-user-factory-id")

  if (userId && username && role && factoryIdStr) {
    return {
      sub: userId,
      username,
      role: role as Role,
      factory_id: parseInt(factoryIdStr, 10),
    }
  }

  let token: string | undefined

  if ("cookies" in req && typeof req.cookies?.get === "function") {
    token = req.cookies.get("token")?.value || req.cookies.get("auth_token")?.value
  }

  if (!token) {
    const authHeader = req.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    return null
  }

  return await verifyJWT(token)
}

/**
 * Centralized auth check helper for API route handlers.
 * Returns verified user or a pre-formatted 401/403 NextResponse error.
 */
export async function requireAuth(
  req: NextRequest | Request,
  requiredRole?: Role
): Promise<{ user: JWTPayload; errorResponse?: NextResponse }> {
  const user = await getAuthUser(req)
  if (!user) {
    return { user: null as never, errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (requiredRole && user.role !== requiredRole) {
    return { user, errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user }
}
