import { NextRequest, NextResponse } from "next/server";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import {
  verifyJWT,
  verifyRefreshToken,
  signJWT,
  signRefreshToken,
  getTokenExpiresIn,
  JWTPayload,
} from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import {
  Role,
  RequestHeader,
  ProjectSlug,
  QueryParam,
  CookieName,
  TableName,
  EntityKey,
} from "@/lib/constants/enums";
export { hasPermission } from "@/lib/store/access";
import { REQUIRED_CREATE_FIELDS } from "@/lib/fields/config";
import { db, supabase } from "@/db";

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
  const pageParam = url.searchParams.get(QueryParam.PAGE);
  const limitParam = url.searchParams.get(QueryParam.LIMIT);

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
  const userId = req.headers.get(RequestHeader.USER_ID);
  const username = req.headers.get(RequestHeader.USERNAME);
  const role = req.headers.get(RequestHeader.ROLE);
  const factoryIdStr = req.headers.get(RequestHeader.FACTORY_ID);

  if (userId && username && role) {
    return {
      user: {
        sub: userId,
        username,
        role: role as Role,
        factory_id: factoryIdStr ? parseInt(factoryIdStr, 10) : 0,
      },
    };
  }

  let token: string | undefined;

  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    token = (req as NextRequest).cookies.get(CookieName.TOKEN)?.value;
  }

  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      return { user: payload };
    }
  }

  // Fallback: Check refresh token to automatically re-authenticate and mint fresh tokens
  let refreshToken: string | undefined;
  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    refreshToken = (req as NextRequest).cookies.get(CookieName.REFRESH_TOKEN)?.value;
  }

  if (!refreshToken) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      refreshToken = authHeader.substring(7);
    }
  }

  if (!refreshToken) return null;

  const refreshPayload = await verifyRefreshToken(refreshToken);
  if (!refreshPayload) return null;

  const idNumber = parseInt(refreshPayload.sub, 10);
  if (isNaN(idNumber)) return null;

  const { data: dbUser, error: userError } = await db
    .from(TableName.USERS)
    .select("*")
    .eq(EntityKey.ID, idNumber)
    .is(EntityKey.DELETED_AT, null)
    .maybeSingle();

  const currentTokenVersion =
    dbUser && typeof dbUser.token_version === "number" ? dbUser.token_version : 1;

  if (userError || !dbUser || currentTokenVersion !== refreshPayload.token_version) {
    return null;
  }

  const factoryId = dbUser.factory_id;

  const newAccessToken = await signJWT({
    sub: String(dbUser.id),
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
    factory_id: factoryId,
  });
  const accessExpiresIn = getTokenExpiresIn(newAccessToken);

  const newRefreshToken = await signRefreshToken({
    sub: String(dbUser.id),
    token_version: currentTokenVersion,
  });
  const refreshExpiresIn = getTokenExpiresIn(newRefreshToken);

  const userPayload: JWTPayload = {
    sub: String(dbUser.id),
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
    factory_id: factoryId,
  };

  return {
    user: userPayload,
    refreshedTokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessExpiresIn,
      refreshExpiresIn,
    },
  };
}

export async function requireAuth(
  req: NextRequest | Request,
  requiredRole?: Role,
): Promise<{
  user: JWTPayload;
  refreshedTokens?: RefreshedTokens;
  errorResponse?: NextResponse;
}> {
  const auth = await getAuthUser(req);
  if (!auth) {
    return {
      user: null as never,
      errorResponse: apiError(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED),
    };
  }
  if (requiredRole && auth.user.role !== requiredRole) {
    return {
      user: auth.user,
      refreshedTokens: auth.refreshedTokens,
      errorResponse: apiError(ReasonPhrases.FORBIDDEN, StatusCodes.FORBIDDEN),
    };
  }
  return { user: auth.user, refreshedTokens: auth.refreshedTokens };
}

type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
) => Promise<NextResponse>;

type EntityIdHandler<P extends Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
  entityId: number,
) => Promise<NextResponse>;

type ScopedEntityHandler<P extends Record<string, string>> = (
  req: NextRequest,
  user: JWTPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
  scope: { entityId: number; factoryId: number },
) => Promise<NextResponse>;

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>,
  requiredRole?: Role,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<NextResponse> => {
    const { user, refreshedTokens, errorResponse } = await requireAuth(req, requiredRole);
    if (errorResponse) return errorResponse;
    const response = await handler(req, user, db, ctx);
    if (refreshedTokens) {
      setAuthCookies(response, refreshedTokens);
    }
    return response;
  };
}

export function withEntityId<P extends Record<string, string> = Record<string, string>>(
  handler: EntityIdHandler<P>,
): AuthedHandler<P> {
  return async (req, user, client, ctx) => {
    const { id } = await ctx.params;
    const entityId = Number(id);
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
      .from(TableName.FACTORIES)
      .select(
        `${EntityKey.ID}, ${EntityKey.NAME}, ${EntityKey.AADHAR_NUMBER_MODE}, ${EntityKey.GOVT_ID_MODE}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`,
      )
      .eq(EntityKey.ID, factoryId)
      .maybeSingle();
    if (!data) return null;
    return {
      [EntityKey.ID]: data[EntityKey.ID],
      [EntityKey.NAME]: data[EntityKey.NAME],
      [EntityKey.AADHAR_NUMBER_MODE]: data[EntityKey.AADHAR_NUMBER_MODE],
      [EntityKey.GOVT_ID_MODE]: data[EntityKey.GOVT_ID_MODE],
      [EntityKey.CREATED_AT]: data[EntityKey.CREATED_AT],
      [EntityKey.UPDATED_AT]: data[EntityKey.UPDATED_AT],
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
) {
  if (!record) return NextResponse.json({ data: null }, { status });
  const formatted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "password_hash" || key === EntityKey.PASSWORD_HASH) {
      continue;
    }
    formatted[key] = value;
  }

  return NextResponse.json({ data: formatted }, { status });
}
