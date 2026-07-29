import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWT } from "@/lib/auth/jwt"
import { AppRoutes, Role } from "@/lib/constants/enums"
import { PUBLIC_ROUTES, AUTH_ROUTES, PUBLIC_API_ROUTES } from "@/lib/constants/routes"

const PUBLIC_PATHNAMES = new Set<string>([
  ...AUTH_ROUTES,
  ...PUBLIC_ROUTES,
  ...PUBLIC_API_ROUTES,
])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Check public route whitelist via enums/constants
  if (PUBLIC_PATHNAMES.has(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get("token")?.value || request.cookies.get("auth_token")?.value

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL(AppRoutes.LOGIN, request.url))
  }

  const payload = await verifyJWT(token)
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }
    return NextResponse.redirect(new URL(AppRoutes.LOGIN, request.url))
  }

  // Centralized Super Admin permission check for factory mutations
  if (pathname.startsWith("/api/factories") && request.method !== "GET" && payload.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Forward verified user session context headers downstream to API handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-user-id", payload.sub)
  requestHeaders.set("x-user-username", payload.username)
  requestHeaders.set("x-user-role", payload.role)
  requestHeaders.set("x-user-factory-id", String(payload.factory_id))

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
