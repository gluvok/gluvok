import { eq, ilike, and, desc, or, count } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes, getFactoryWhereClause, fetchPaginatedResult, formatEntityResponse } from "@/db/helpers"
import { Role, TenantMode, ProjectSlug, QueryParam, PermissionKey } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, db, mode) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)

  const { centers } = getTables(mode)
  const factories = mode === TenantMode.SHARED ? sharedSchema.factories : undefined
  const isSuperAdminShared = mode === TenantMode.SHARED && user.role === Role.SUPER_ADMIN

  const factoryCond = getFactoryWhereClause(user, mode, sharedSchema.centers.factoryId, req.nextUrl.searchParams)
  const conditions = []
  if (factoryCond) conditions.push(factoryCond)

  if (search) {
    const searchNum = parseInt(search, 10)
    const searchConds = [ilike(centers.name, `%${search}%`)]
    if (!isNaN(searchNum)) {
      searchConds.push(eq(centers.id, searchNum))
    }
    if (isSuperAdminShared && factories) {
      searchConds.push(ilike(factories.name, `%${search}%`))
      if (!isNaN(searchNum)) {
        searchConds.push(eq(sharedSchema.centers.factoryId, searchNum))
      }
    }
    conditions.push(or(...searchConds))
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  let baseQuery = db
    .select({
      id: centers.id,
      name: centers.name,
      ...(mode === TenantMode.SHARED ? { factory_id: sharedSchema.centers.factoryId } : {}),
      created_at: centers.createdAt,
      updated_at: centers.updatedAt,
      ...(isSuperAdminShared && factories ? { factory_name: factories.name } : {}),
    })
    .from(centers)
    .$dynamic()

  if (isSuperAdminShared && factories) {
    baseQuery = baseQuery.leftJoin(factories, eq(sharedSchema.centers.factoryId, factories.id)) as typeof baseQuery
  }

  let countQuery = db.select({ count: count() }).from(centers).$dynamic()
  if (isSuperAdminShared && factories) {
    countQuery = countQuery.leftJoin(factories, eq(sharedSchema.centers.factoryId, factories.id)) as typeof countQuery
  }

  return fetchPaginatedResult(db, countQuery, baseQuery, whereClause, pagination, desc(centers.createdAt))
})

export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.CENTERS)
  if (err) return err

  const { name, factory_id } = body
  const { centers } = getTables(mode) as unknown as { centers: Parameters<typeof db.insert>[0] }

  const insertValues: Record<string, unknown> = { name }
  if (mode === TenantMode.SHARED) {
    insertValues.factoryId = user.role === Role.SUPER_ADMIN && factory_id ? Number(factory_id) : (user.factory_id ?? 0)
  }

  const [newCenter] = await db.insert(centers).values(insertValues as typeof sharedSchema.centers.$inferInsert).returning()
  return formatEntityResponse(newCenter, mode, StatusCodes.CREATED)
})
