import { NextRequest, NextResponse } from "next/server"
import { eq, count, and, desc } from "drizzle-orm"
import { db } from "@/db"
import { rates, commodities, factories } from "@/db/schema"
import { getAuthUser, getPaginationParams } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { page, limit, offset } = getPaginationParams(req.nextUrl)

    const conditions = []
    if (authUser.role !== Role.SUPER_ADMIN) {
      conditions.push(eq(rates.factoryId, authUser.factory_id))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(rates)
      .where(whereClause)

    const rows = await db
      .select({
        id: rates.id,
        commodityId: rates.commodityId,
        unitPrice: rates.unitPrice,
        unit: rates.unit,
        factoryId: rates.factoryId,
        createdAt: rates.createdAt,
        updatedAt: rates.updatedAt,
        commodityName: commodities.name,
        factoryName: factories.name,
      })
      .from(rates)
      .leftJoin(commodities, eq(rates.commodityId, commodities.id))
      .leftJoin(factories, eq(rates.factoryId, factories.id))
      .where(whereClause)
      .orderBy(desc(rates.createdAt))
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
    console.error("GET /api/rates error:", error)
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { commodityId, unitPrice, unit, factoryId } = body

    if (!commodityId || !unitPrice || !unit) {
      return NextResponse.json({ error: "commodityId, unitPrice, and unit are required" }, { status: 400 })
    }

    const targetFactoryId = authUser.role === Role.SUPER_ADMIN && factoryId ? Number(factoryId) : authUser.factory_id

    const [newRate] = await db
      .insert(rates)
      .values({
        commodityId: Number(commodityId),
        unitPrice: String(unitPrice),
        unit,
        factoryId: targetFactoryId,
      })
      .returning()

    return NextResponse.json({ data: newRate }, { status: 201 })
  } catch (error) {
    console.error("POST /api/rates error:", error)
    return NextResponse.json({ error: "Failed to create rate" }, { status: 500 })
  }
}
