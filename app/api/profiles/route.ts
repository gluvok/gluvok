import { NextRequest, NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { profiles, users, factories } from "@/db/schema"
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
        userId: profiles.userId,
        name: profiles.name,
        aadharNumber: profiles.aadharNumber,
        role: profiles.role,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
        username: users.username,
        factoryId: users.factoryId,
        isActive: users.isActive,
        factoryName: factories.name,
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
