import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { verifyJWT, verifyRefreshToken } from "@/lib/auth/jwt";
import { AppRoutes, PUBLIC_ROUTES, AUTH_ROUTES, PUBLIC_API_ROUTES } from "@/lib/constants/routes";

const PUBLIC_PATHNAMES = new Set<string>([...AUTH_ROUTES, ...PUBLIC_ROUTES, ...PUBLIC_API_ROUTES]);

const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|css|js)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    STATIC_EXTENSIONS.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHNAMES.has(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];

  const isApiRoute = pathname.startsWith("/api/");

  const payload = token ? await verifyJWT(token) : null;

  if (!payload) {
    const refreshToken = request.cookies.get("refresh_token")?.value;
    const refreshPayload = refreshToken ? await verifyRefreshToken(refreshToken) : null;

    if (refreshPayload) {
      return NextResponse.next();
    }

    return isApiRoute
      ? NextResponse.json(
          { error: ReasonPhrases.UNAUTHORIZED },
          { status: StatusCodes.UNAUTHORIZED },
        )
      : NextResponse.redirect(new URL(AppRoutes.LOGIN, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-username", payload.username);
  requestHeaders.set("x-user-name", payload.name);
  requestHeaders.set("x-user-role", payload.role);

  if (payload.factory_id != null) {
    requestHeaders.set("x-user-factory-id", String(payload.factory_id));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
