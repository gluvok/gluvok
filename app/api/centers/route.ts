import { NextRequest, NextResponse } from "next/server"
import { eq, ilike, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { centers, factories } from "@/db/schema"
import { getAuthUser, getPaginationParams } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
        factoryId: centers.factoryId,
        createdAt: centers.createdAt,
        updatedAt: centers.updatedAt,
        factoryName: factories.name,
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
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, factoryId } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const targetFactoryId = authUser.role === Role.SUPER_ADMIN && factoryId ? Number(factoryId) : authUser.factory_id

    const [newCenter] = await db
      .insert(centers)
      .values({
        name,
        factoryId: targetFactoryId,
      })
      .returning()

    return NextResponse.json({ data: newCenter }, { status: 201 })
  } catch (error) {
    console.error("POST /api/centers error:", error)
    return NextResponse.json({ error: "Failed to create center" }, { status: 500 })
  }
}
