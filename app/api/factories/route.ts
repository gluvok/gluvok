import { NextRequest, NextResponse } from "next/server"
import { eq, ilike, count, desc } from "drizzle-orm"
import { db } from "@/db"
import { factories } from "@/db/schema"
import { requireAuth, getPaginationParams } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { page, limit, offset } = getPaginationParams(req.nextUrl)
    const search = req.nextUrl.searchParams.get("search")

    let whereClause = undefined
    if (authUser.role !== Role.SUPER_ADMIN) {
      whereClause = eq(factories.id, authUser.factory_id)
    } else if (search) {
      whereClause = ilike(factories.name, `%${search}%`)
    }

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(factories)
      .where(whereClause)

    const rows = await db
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
    console.error("GET /api/factories error:", error)
    return NextResponse.json({ error: "Failed to fetch factories" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth(req, Role.SUPER_ADMIN)
    if (errorResponse) return errorResponse

    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

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
    }, { status: 201 })
  } catch (error) {
    console.error("POST /api/factories error:", error)
    return NextResponse.json({ error: "Failed to create factory" }, { status: 500 })
  }
}
