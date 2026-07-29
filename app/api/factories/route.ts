import { NextResponse } from "next/server"
import { eq, ilike, count, desc } from "drizzle-orm"
import { db } from "@/db"
import { factories } from "@/db/schema"
import { withAuth, getPaginationParams, forbiddenError, hasPermission, validateRequiredFields, StatusCodes } from "@/db/helpers"
import { Role, ProjectSlug, PermissionKey, QueryParam } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)

  const whereClause =
    user.role !== Role.SUPER_ADMIN
      ? eq(factories.id, user.factory_id)
      : search
        ? ilike(factories.name, `%${search}%`)
        : undefined

  const [totalCountResult, rows] = await Promise.all([
    db.select({ count: count() }).from(factories).where(whereClause),
    db
      .select({
        id: factories.id,
        name: factories.name,
        created_at: factories.createdAt,
        updated_at: factories.updatedAt,
      })
      .from(factories)
      .where(whereClause)
      .orderBy(desc(factories.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  const total = Number(totalCountResult[0]?.count || 0)

  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total },
  })
})

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.FACTORIES, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.FACTORIES)
  if (err) return err

  const { name } = body

  const [newFactory] = await db
    .insert(factories)
    .values({ name })
    .returning()

  return NextResponse.json({
    data: {
      id: newFactory.id,
      name: newFactory.name,
      created_at: newFactory.createdAt,
      updated_at: newFactory.updatedAt,
    },
  }, { status: StatusCodes.CREATED })
})
