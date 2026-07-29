import { NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { customers, users, factories } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers"
import { Role, ProjectSlug, PermissionKey, QueryParam } from "@/lib/constants/enums"
import { hashPassword } from "@/lib/auth/password"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)

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

  const [totalCountResult, rows] = await Promise.all([
    db.select({ count: count() }).from(customers).where(whereClause),
    db
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
      .offset(offset),
  ])

  const total = Number(totalCountResult[0]?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withAuth(async (req, user) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.CUSTOMERS)
  if (err) return err

  const { govt_id, name, father_name, username, password, factory_id } = body
  const targetFactoryId = user.role === Role.SUPER_ADMIN && factory_id ? Number(factory_id) : user.factory_id

  let createdUserId: string | null = null
  if (username && password) {
    const passwordHash = await hashPassword(password)
    const [newUser] = await db
      .insert(users)
      .values({ username, passwordHash, role: Role.BASE, factoryId: targetFactoryId })
      .returning()
    createdUserId = newUser.id
  }

  const [newCustomer] = await db
    .insert(customers)
    .values({
      govtId: Number(govt_id),
      name,
      fatherName: father_name,
      userId: createdUserId,
      factoryId: targetFactoryId,
    })
    .returning()

  return NextResponse.json({
    data: {
      id: newCustomer.id,
      govt_id: newCustomer.govtId,
      name: newCustomer.name,
      father_name: newCustomer.fatherName,
      user_id: newCustomer.userId,
      factory_id: newCustomer.factoryId,
      created_at: newCustomer.createdAt,
      updated_at: newCustomer.updatedAt,
    },
  }, { status: StatusCodes.CREATED })
})

