import { NextRequest, NextResponse } from "next/server"
import { ilike, count, desc } from "drizzle-orm"
import { db } from "@/db"
import { commodities } from "@/db/schema"
import { requireAuth, getPaginationParams } from "@/db/helpers"

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { page, limit, offset } = getPaginationParams(req.nextUrl)
    const search = req.nextUrl.searchParams.get("search")

    const whereClause = search ? ilike(commodities.name, `%${search}%`) : undefined

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(commodities)
      .where(whereClause)

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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/commodities error:", error)
    return NextResponse.json({ error: "Failed to fetch commodities" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [newCommodity] = await db
      .insert(commodities)
      .values({ name })
      .returning()

    return NextResponse.json({
      data: {
        id: newCommodity.id,
        name: newCommodity.name,
        created_at: newCommodity.createdAt,
        updated_at: newCommodity.updatedAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("POST /api/commodities error:", error)
    return NextResponse.json({ error: "Failed to create commodity" }, { status: 500 })
  }
}
