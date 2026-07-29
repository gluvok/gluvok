import { NextRequest, NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { customers, users, factories } from "@/db/schema"
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
      conditions.push(eq(customers.factoryId, authUser.factory_id))
    }

    if (search) {
      const searchNum = parseInt(search, 10)
      if (!isNaN(searchNum)) {
        conditions.push(
          or(
            ilike(customers.name, `%${search}%`),
            ilike(customers.fatherName, `%${search}%`),
            eq(customers.govtId, searchNum)
          )
        )
      } else {
        conditions.push(
          or(
            ilike(customers.name, `%${search}%`),
            ilike(customers.fatherName, `%${search}%`)
          )
        )
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(whereClause)

    const rows = await db
      .select({
        id: customers.id,
        govtId: customers.govtId,
        name: customers.name,
        fatherName: customers.fatherName,
        userId: customers.userId,
        factoryId: customers.factoryId,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        username: users.username,
        isActive: users.isActive,
        factoryName: factories.name,
      })
      .from(customers)
      .leftJoin(users, eq(customers.userId, users.id))
      .leftJoin(factories, eq(customers.factoryId, factories.id))
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
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
    console.error("GET /api/customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
