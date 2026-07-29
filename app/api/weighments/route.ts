import { NextRequest, NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { weighments, rates, commodities, centers, profiles, customers } from "@/db/schema"
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
      conditions.push(
        or(
          ilike(weighments.vehicleNumber, `%${search}%`),
          ilike(customers.name, `%${search}%`),
          ilike(profiles.name, `%${search}%`),
          ilike(centers.name, `%${search}%`)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(weighments)
      .leftJoin(centers, eq(weighments.centerId, centers.id))
      .leftJoin(customers, eq(weighments.customerId, customers.id))
      .leftJoin(profiles, eq(weighments.profileId, profiles.id))
      .where(whereClause)

    const rows = await db
      .select({
        id: weighments.id,
        vehicleNumber: weighments.vehicleNumber,
        weight: weighments.weight,
        images: weighments.images,
        unit: weighments.unit,
        type: weighments.type,
        rateId: weighments.rateId,
        centerId: weighments.centerId,
        profileId: weighments.profileId,
        customerId: weighments.customerId,
        isActive: weighments.isActive,
        createdAt: weighments.createdAt,
        updatedAt: weighments.updatedAt,
        centerName: centers.name,
        profileName: profiles.name,
        customerName: customers.name,
        commodityName: commodities.name,
        unitPrice: rates.unitPrice,
      })
      .from(weighments)
      .leftJoin(rates, eq(weighments.rateId, rates.id))
      .leftJoin(commodities, eq(rates.commodityId, commodities.id))
      .leftJoin(centers, eq(weighments.centerId, centers.id))
      .leftJoin(profiles, eq(weighments.profileId, profiles.id))
      .leftJoin(customers, eq(weighments.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(weighments.createdAt))
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
    console.error("GET /api/weighments error:", error)
    return NextResponse.json({ error: "Failed to fetch weighments" }, { status: 500 })
  }
}
