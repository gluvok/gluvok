import { NextResponse } from "next/server"
import { eq, ilike, desc } from "drizzle-orm"
import { factories } from "@/db/schema"
import { withAuth, getPaginationParams, forbiddenError, hasPermission, validateRequiredFields, StatusCodes, fetchPaginatedResult, formatEntityResponse } from "@/db/helpers"
import { Role, TenantMode, ProjectSlug, PermissionKey, QueryParam } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, db, mode) => {
  // Dedicated mode: no factories table
  if (mode === TenantMode.DEDICATED) {
    return NextResponse.json({ data: [], pagination: { page: 1, limit: 10, total: 0 } })
  }

  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)

  const whereClause =
    user.role !== Role.SUPER_ADMIN && user.factory_id != null
      ? eq(factories.id, user.factory_id)
      : search
        ? ilike(factories.name, `%${search}%`)
        : undefined

  const baseQuery = db
    .select({
      id: factories.id,
      name: factories.name,
      created_at: factories.createdAt,
      updated_at: factories.updatedAt,
    })
    .from(factories)

  return fetchPaginatedResult(db, factories, baseQuery, whereClause, pagination, desc(factories.createdAt))
})

export const POST = withAuth(async (req, user, db, mode) => {
  if (mode === TenantMode.DEDICATED) {
    return NextResponse.json({ error: "Not available in dedicated mode" }, { status: 405 })
  }
  if (!hasPermission(user, ProjectSlug.FACTORIES, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.FACTORIES)
  if (err) return err

  const { name } = body

  const [newFactory] = await db
    .insert(factories)
    .values({ name })
    .returning()

  return formatEntityResponse(newFactory, mode, StatusCodes.CREATED)
})
