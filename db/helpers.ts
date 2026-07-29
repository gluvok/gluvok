import { NextRequest } from "next/server"
import { verifyJWT, JWTPayload } from "@/lib/auth/jwt"

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
 * Extracts and verifies JWT from cookies or Authorization header.
 */
export async function getAuthUser(req: NextRequest | Request): Promise<JWTPayload | null> {
  let token: string | undefined

  if ("cookies" in req && typeof req.cookies?.get === "function") {
    token = req.cookies.get("token")?.value
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
