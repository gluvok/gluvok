import { NextResponse } from "next/server"
import { ilike, count, desc } from "drizzle-orm"
import { db } from "@/db"
import { commodities } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { ProjectSlug, QueryParam, PermissionKey } from "@/lib/constants/enums"

export const GET = withAuth(async (req) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const whereClause = search ? ilike(commodities.name, `%${search}%`) : undefined

  const [totalCountResult, rows] = await Promise.all([
    db.select({ count: count() }).from(commodities).where(whereClause),
    db
      .select({
        id: commodities.id,
        name: commodities.name,
        created_at: commodities.createdAt,
        updated_at: commodities.updatedAt,
      })
      .from(commodities)
      .where(whereClause)
      .orderBy(desc(commodities.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  const total = Number(totalCountResult[0]?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.COMMODITIES)
  if (err) return err

  const { name } = body
  const [newCommodity] = await db.insert(commodities).values({ name }).returning()

  return NextResponse.json({
    data: {
      id: newCommodity.id,
      name: newCommodity.name,
      created_at: newCommodity.createdAt,
      updated_at: newCommodity.updatedAt,
    },
  }, { status: StatusCodes.CREATED })
})
