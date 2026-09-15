import { NextRequest, NextResponse } from "next/server";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { type AuthUserPayload } from "@/types";
import { ProjectSlug } from "@/lib/constants/enums";
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

export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  return (
    e.code === "23505" || (typeof e.message === "string" && e.message.includes("unique constraint"))
  );
}

export function isCheckConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  return (
    e.code === "23514" ||
    (typeof e.message === "string" && e.message.includes("violates check constraint"))
  );
}

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

import { getAuthUser } from "@/lib/auth/request";
export { getAuthUser };

export type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: AuthUserPayload,
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

    return handler(req, authResult.user, supabase, ctx);
  };
}

export type ScopedEntityHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  user: AuthUserPayload,
  client: typeof supabase,
  ctx: RouteContext<P>,
  scope: { entityId: number; factoryId: number },
) => Promise<NextResponse>;

function withEntityId<P extends Record<string, string> = Record<string, string>>(
  handler: (
    req: NextRequest,
    user: AuthUserPayload,
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
