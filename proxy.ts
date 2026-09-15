import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { validateSession } from "@/lib/auth/session";
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
    request.cookies.get("session_token")?.value ||
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];

  const isApiRoute = pathname.startsWith("/api/");

  const sessionUser = token ? await validateSession(token) : null;

  if (!sessionUser) {
    return isApiRoute
      ? NextResponse.json(
          { error: ReasonPhrases.UNAUTHORIZED },
          { status: StatusCodes.UNAUTHORIZED },
        )
      : NextResponse.redirect(new URL(AppRoutes.LOGIN, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", sessionUser.sub);
  requestHeaders.set("x-user-username", sessionUser.username);
  requestHeaders.set("x-user-name", sessionUser.name);
  requestHeaders.set("x-user-role", sessionUser.role);

  if (sessionUser.factory_id != null) {
    requestHeaders.set("x-user-factory-id", String(sessionUser.factory_id));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
