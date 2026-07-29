import { NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { customers, users, factories } from "@/db/schema"
import { withAuth, getPaginationParams } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get("search")

  const conditions = []
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(customers.factoryId, user.factory_id))
  if (search) {
    const searchNum = parseInt(search, 10)
    const searchConds = isNaN(searchNum)
      ? or(ilike(customers.name, `%${search}%`), ilike(customers.fatherName, `%${search}%`))
      : or(ilike(customers.name, `%${search}%`), ilike(customers.fatherName, `%${search}%`), eq(customers.govtId, searchNum))
    if (searchConds) conditions.push(searchConds)
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalCountResult] = await db.select({ count: count() }).from(customers).where(whereClause)
  const rows = await db
    .select({
      id: customers.id,
      govt_id: customers.govtId,
      name: customers.name,
      father_name: customers.fatherName,
      user_id: customers.userId,
      factory_id: customers.factoryId,
      created_at: customers.createdAt,
      updated_at: customers.updatedAt,
      username: users.username,
      is_active: users.isActive,
      factory_name: factories.name,
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
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})
