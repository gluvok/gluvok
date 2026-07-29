import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWT } from "@/lib/auth/jwt"
import { AppRoutes } from "@/lib/constants/enums"
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

  const token = request.cookies.get("token")?.value

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

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
