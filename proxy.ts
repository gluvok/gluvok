import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { StatusCodes, ReasonPhrases } from "http-status-codes"
import { verifyJWT } from "@/lib/auth/jwt"
import {
  AppRoutes,
  ApiPrefix,
  CookieName,
  RequestHeader,
} from "@/lib/constants/enums"
import { PUBLIC_ROUTES, AUTH_ROUTES, PUBLIC_API_ROUTES } from "@/lib/constants/routes"

const PUBLIC_PATHNAMES = new Set<string>([
  ...AUTH_ROUTES,
  ...PUBLIC_ROUTES,
  ...PUBLIC_API_ROUTES,
])

const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|css|js)$/

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith(ApiPrefix.NEXT) ||
    pathname.startsWith(ApiPrefix.FAVICON) ||
    STATIC_EXTENSIONS.test(pathname)
  ) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHNAMES.has(pathname)) {
    return NextResponse.next()
  }

  const token =
    request.cookies.get(CookieName.TOKEN)?.value ||
    request.cookies.get(CookieName.AUTH_TOKEN)?.value ||
    request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1]

  const isApiRoute = pathname.startsWith(ApiPrefix.API)

  if (!token) {
    return isApiRoute
      ? NextResponse.json({ error: ReasonPhrases.UNAUTHORIZED }, { status: StatusCodes.UNAUTHORIZED })
      : NextResponse.redirect(new URL(AppRoutes.LOGIN, request.url))
  }

  const payload = await verifyJWT(token)
  if (!payload) {
    return isApiRoute
      ? NextResponse.json({ error: ReasonPhrases.UNAUTHORIZED }, { status: StatusCodes.UNAUTHORIZED })
      : NextResponse.redirect(new URL(AppRoutes.LOGIN, request.url))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(RequestHeader.USER_ID, payload.sub)
  requestHeaders.set(RequestHeader.USERNAME, payload.username)
  requestHeaders.set(RequestHeader.ROLE, payload.role)

  if (payload.factory_id != null) {
    requestHeaders.set(RequestHeader.FACTORY_ID, String(payload.factory_id))
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
