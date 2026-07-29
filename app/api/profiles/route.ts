import { NextRequest, NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { profiles, users, factories } from "@/db/schema"
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
      conditions.push(eq(users.factoryId, authUser.factory_id))
    }

    if (search) {
      conditions.push(
        or(
          ilike(profiles.name, `%${search}%`),
          ilike(profiles.aadharNumber, `%${search}%`),
          ilike(users.username, `%${search}%`)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(whereClause)

    const rows = await db
      .select({
        id: profiles.id,
        user_id: profiles.userId,
        name: profiles.name,
        aadhar_number: profiles.aadharNumber,
        role: profiles.role,
        created_at: profiles.createdAt,
        updated_at: profiles.updatedAt,
        username: users.username,
        factory_id: users.factoryId,
        is_active: users.isActive,
        factory_name: factories.name,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .leftJoin(factories, eq(users.factoryId, factories.id))
      .where(whereClause)
      .orderBy(desc(profiles.createdAt))
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
    console.error("GET /api/profiles error:", error)
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
  }
}
