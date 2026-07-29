import { NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { weighments, rates, commodities, centers, profiles, customers } from "@/db/schema"
import { withAuth, getPaginationParams } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get("search")

  const conditions = []
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(centers.factoryId, user.factory_id))
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
      vehicle_number: weighments.vehicleNumber,
      weight: weighments.weight,
      images: weighments.images,
      unit: weighments.unit,
      type: weighments.type,
      rate_id: weighments.rateId,
      center_id: weighments.centerId,
      profile_id: weighments.profileId,
      customer_id: weighments.customerId,
      is_active: weighments.isActive,
      created_at: weighments.createdAt,
      updated_at: weighments.updatedAt,
      center_name: centers.name,
      profile_name: profiles.name,
      customer_name: customers.name,
      commodity_name: commodities.name,
      unit_price: rates.unitPrice,
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
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})
