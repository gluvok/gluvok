import { NextRequest, NextResponse } from "next/server"
import { eq, ilike, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { centers, factories } from "@/db/schema"
import { requireAuth, getPaginationParams } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { page, limit, offset } = getPaginationParams(req.nextUrl)
    const search = req.nextUrl.searchParams.get("search")

    const conditions = []

    if (authUser.role !== Role.SUPER_ADMIN) {
      conditions.push(eq(centers.factoryId, authUser.factory_id))
    }

    if (search) {
      conditions.push(ilike(centers.name, `%${search}%`))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(centers)
      .where(whereClause)

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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/centers error:", error)
    return NextResponse.json({ error: "Failed to fetch centers" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const body = await req.json()
    const { name, factoryId, factory_id } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const rawFactoryId = factoryId ?? factory_id
    const targetFactoryId = authUser.role === Role.SUPER_ADMIN && rawFactoryId ? Number(rawFactoryId) : authUser.factory_id

    const [newCenter] = await db
      .insert(centers)
      .values({
        name,
        factoryId: targetFactoryId,
      })
      .returning()

    return NextResponse.json({
      data: {
        id: newCenter.id,
        name: newCenter.name,
        factory_id: newCenter.factoryId,
        created_at: newCenter.createdAt,
        updated_at: newCenter.updatedAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("POST /api/centers error:", error)
    return NextResponse.json({ error: "Failed to create center" }, { status: 500 })
  }
}
