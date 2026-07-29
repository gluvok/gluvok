import { NextResponse } from "next/server"
import { eq, ilike, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { centers, factories } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { Role, ProjectSlug, QueryParam, PermissionKey } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)

  const conditions = []
  if (user.role !== Role.SUPER_ADMIN && user.factory_id != null ? user.factory_id : 0) {
    conditions.push(eq(centers.factoryId, user.factory_id != null ? user.factory_id : 0))
  }
  if (search) conditions.push(ilike(centers.name, `%${search}%`))
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const isSuperAdmin = user.role === Role.SUPER_ADMIN

  let baseQuery = db
    .select({
      id: centers.id,
      name: centers.name,
      factory_id: centers.factoryId,
      created_at: centers.createdAt,
      updated_at: centers.updatedAt,
      ...(isSuperAdmin ? { factory_name: factories.name } : {}),
    })
    .from(centers)
    .$dynamic()

  if (isSuperAdmin) {
    baseQuery = baseQuery.leftJoin(factories, eq(centers.factoryId, factories.id)) as typeof baseQuery
  }

  const [totalCountResult, rows] = await Promise.all([
    db.select({ count: count() }).from(centers).where(whereClause),
    baseQuery.where(whereClause).orderBy(desc(centers.createdAt)).limit(limit).offset(offset),
  ])

  const total = Number(totalCountResult[0]?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total },
  })
})

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.CENTERS)
  if (err) return err

  const { name, factory_id } = body
  const targetFactoryId = user.role === Role.SUPER_ADMIN && factory_id ? Number(factory_id) : user.factory_id != null ? user.factory_id : 0

  const [newCenter] = await db.insert(centers).values({ name, factoryId: targetFactoryId }).returning()

  return NextResponse.json({
    data: {
      id: newCenter.id,
      name: newCenter.name,
      factory_id: newCenter.factoryId,
      created_at: newCenter.createdAt,
      updated_at: newCenter.updatedAt,
    },
  }, { status: StatusCodes.CREATED })
})
