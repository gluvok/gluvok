import { NextResponse } from "next/server"
import { eq, ilike, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { centers, factories } from "@/db/schema"
import { withAuth, getPaginationParams, apiError, StatusCodes } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get("search")

  const conditions = []
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(centers.factoryId, user.factory_id))
  if (search) conditions.push(ilike(centers.name, `%${search}%`))
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalCountResult] = await db.select({ count: count() }).from(centers).where(whereClause)

  const rows = await db
    .select({
      id: centers.id,
      name: centers.name,
      factory_id: centers.factoryId,
      created_at: centers.createdAt,
      updated_at: centers.updatedAt,
      factory_name: factories.name,
    })
    .from(centers)
    .leftJoin(factories, eq(centers.factoryId, factories.id))
    .where(whereClause)
    .orderBy(desc(centers.createdAt))
    .limit(limit)
    .offset(offset)

  const total = Number(totalCountResult?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { name, factoryId, factory_id } = body
  if (!name || typeof name !== "string") return apiError("Name is required", StatusCodes.BAD_REQUEST)

  const rawFactoryId = factoryId ?? factory_id
  const targetFactoryId = user.role === Role.SUPER_ADMIN && rawFactoryId ? Number(rawFactoryId) : user.factory_id

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
