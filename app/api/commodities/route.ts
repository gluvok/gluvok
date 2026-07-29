import { NextResponse } from "next/server"
import { ilike, count, desc } from "drizzle-orm"
import { db } from "@/db"
import { commodities } from "@/db/schema"
import { withAuth, getPaginationParams, apiError, StatusCodes } from "@/db/helpers"

export const GET = withAuth(async (req) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get("search")
  const whereClause = search ? ilike(commodities.name, `%${search}%`) : undefined

  const [totalCountResult] = await db.select({ count: count() }).from(commodities).where(whereClause)
  const rows = await db
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
    .offset(offset)

  const total = Number(totalCountResult?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withAuth(async (req) => {
  const { name } = await req.json()
  if (!name || typeof name !== "string") return apiError("Name is required", StatusCodes.BAD_REQUEST)

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
