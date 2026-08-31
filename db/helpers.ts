import { NextRequest, NextResponse } from "next/server";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { verifyJWT, verifyRefreshToken, JWTPayload } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import { fetchActiveUserById, generateAuthTokens } from "@/lib/auth/common";
import { Role, ProjectSlug } from "@/lib/constants/enums";
export { hasPermission } from "@/lib/store/access";
import { REQUIRED_CREATE_FIELDS } from "@/lib/fields/config";
import { supabase } from "@/db";

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>;
};

export { StatusCodes };

export function apiError(message: string, status: StatusCodes): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function validateRequiredFields(
  body: Record<string, unknown>,
  slug: ProjectSlug,
): NextResponse | null {
  const requiredKeys = REQUIRED_CREATE_FIELDS[slug] || [];
  const missing = requiredKeys.filter(
    (key) => body[key] === undefined || body[key] === null || body[key] === "",
  );

  if (missing.length > 0) {
    return apiError(
      `Missing required fields: ${missing.join(", ")}`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  return null;
}

export function forbiddenError(message = ReasonPhrases.FORBIDDEN): NextResponse {
  return apiError(message, StatusCodes.FORBIDDEN);
}

export function getPaginationParams(url: URL): PaginationParams {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");

  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 10;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function parseBulkIds(body: unknown): number[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { ids?: unknown }).ids)) {
    return null;
  }

  const ids = (body as { ids: unknown[] }).ids;
  if (ids.length === 0 || ids.length > 100) return null;

  const numericIds = ids.map((id) => Number(id));
  if (!numericIds.every((id) => Number.isSafeInteger(id) && id > 0)) return null;

  return [...new Set(numericIds)];
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

export async function getAuthUser(
  req: NextRequest | Request,
): Promise<{ user: JWTPayload; refreshedTokens?: RefreshedTokens } | null> {
  const userId = req.headers.get("x-user-id");
  const username = req.headers.get("x-user-username");
  const rawName = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  const factoryIdStr = req.headers.get("x-user-factory-id");

  if (userId && username && role && rawName) {
    return {
      user: {
        sub: userId,
        username,
        name: decodeURIComponent(rawName),
        role: role as Role,
        factory_id: factoryIdStr ? parseInt(factoryIdStr, 10) : 1,
        token_version: 1,
      },
    };
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);
    if (payload) {
      return { user: payload };
    }
  }

  let cookieAccessToken: string | undefined;
  let cookieRefreshToken: string | undefined;

  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    const nextReq = req as NextRequest;
    cookieAccessToken =
      nextReq.cookies.get("token")?.value || nextReq.cookies.get("accessToken")?.value;
    cookieRefreshToken =
      nextReq.cookies.get("refresh_token")?.value || nextReq.cookies.get("refreshToken")?.value;
  } else {
    const cookieHeader = req.headers.get("cookie") || "";
    const parsedCookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.trim().split("=");
      if (parts[0]) {
        parsedCookies[parts[0]] = parts.slice(1).join("=");
      }
    });
    cookieAccessToken = parsedCookies["token"] || parsedCookies["accessToken"];
    cookieRefreshToken = parsedCookies["refresh_token"] || parsedCookies["refreshToken"];
  }

  if (cookieAccessToken) {
    const payload = await verifyJWT(cookieAccessToken);
    if (payload) {
      return { user: payload };
    }
  }

  if (cookieRefreshToken) {
    const refreshPayload = await verifyRefreshToken(cookieRefreshToken);
    if (refreshPayload) {
      const user = await fetchActiveUserById(Number(refreshPayload.sub));
      if (user && user.token_version === refreshPayload.token_version) {
        const tokens = await generateAuthTokens(user);
        const newPayload: JWTPayload = {
          sub: String(user.id),
          username: user.username,
          name: user.name,
          role: user.role,
          factory_id: user.factory_id,
          factory_name: user.factories?.name,
          token_version: user.token_version,
        };

        return {
          user: newPayload,
          refreshedTokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessExpiresIn: tokens.accessExpiresIn,
            refreshExpiresIn: tokens.refreshExpiresIn,
          },
        };
      }
    }
  }

  return null;
}

export type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
) => Promise<NextResponse>;

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    const authResult = await getAuthUser(req);
    if (!authResult) {
      return apiError(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED);
    }

    const { user, refreshedTokens } = authResult;
    const response = await handler(req, user, supabase, ctx);

    if (refreshedTokens) {
      setAuthCookies(response, refreshedTokens);
    }

    return response;
  };
}

export type ScopedEntityHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
  scope: { entityId: number; factoryId: number },
) => Promise<NextResponse>;

export function withEntityId<P extends Record<string, string> = Record<string, string>>(
  handler: (
    req: NextRequest,
    user: JWTPayload,
    client: typeof supabase,
    ctx: RouteContext<P>,
    entityId: number,
  ) => Promise<NextResponse>,
): AuthedHandler<P> {
  return async (req, user, client, ctx) => {
    const resolvedParams = await ctx.params;
    const rawId = (resolvedParams as Record<string, string | undefined>)["id"];
    const entityId = Number(rawId);

    if (!Number.isSafeInteger(entityId) || entityId <= 0) {
      return apiError("Invalid entity ID", StatusCodes.BAD_REQUEST);
    }

    return handler(req, user, client, ctx, entityId);
  };
}

export function withEntityScope<P extends Record<string, string> = Record<string, string>>(
  handler: ScopedEntityHandler<P>,
): AuthedHandler<P> {
  return withEntityId(async (req, user, client, ctx, entityId) => {
    return handler(req, user, client, ctx, { entityId, factoryId: user.factory_id });
  });
}

export async function getFactory(client: typeof supabase, factoryId: number | null | undefined) {
  if (!factoryId) return null;
  try {
    const { data } = await client
      .from("factories")
      .select("id, name, created_at, updated_at")
      .eq("id", factoryId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
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
    end: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    count: number | null;
    error: { message?: string } | null;
  }>;
}

export async function fetchPaginatedResult<T = Record<string, unknown>>(
  query: SupabasePaginatedQuery,
  pagination: PaginationParams,
) {
  const { page, limit, offset } = pagination;
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    console.error("Supabase query error:", error);
    return apiError(error.message || "Database query failed", StatusCodes.INTERNAL_SERVER_ERROR);
  }
  const total = count ?? (data?.length || 0);
  return NextResponse.json({
    data: (data || []) as T[],
    pagination: { page, limit, total },
  });
}

export function formatEntityResponse<T extends Record<string, unknown>>(
  record: T,
  status: number = StatusCodes.OK,
  extra?: Record<string, unknown>,
) {
  if (!record) return NextResponse.json({ data: null, ...extra }, { status });
  const formatted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "password_hash") {
      continue;
    }
    formatted[key] = value;
  }

  return NextResponse.json({ data: formatted, ...extra }, { status });
}

export async function getBaseUserCustomerIds(
  client: typeof supabase,
  userId: number,
): Promise<number[]> {
  const { data } = await client
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null);

  return (data || []).map((c: { id: number }) => c.id);
}

