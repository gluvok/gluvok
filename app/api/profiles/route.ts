import { NextResponse } from "next/server"
import { eq, ilike, count, and, desc, or } from "drizzle-orm"
import { db } from "@/db"
import { profiles, users, factories } from "@/db/schema"
import { withAuth, getPaginationParams, apiError, StatusCodes } from "@/db/helpers"
import { Role, QueryParam } from "@/lib/constants/enums"
import { createProfileSchema } from "@/lib/validations/profile"
import { hashPassword } from "@/lib/auth/password"

export const GET = withAuth(async (req, user) => {
  const { page, limit, offset } = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)

  const conditions = []
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(users.factoryId, user.factory_id))
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

  const [totalCountResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(whereClause),
    db
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
      .offset(offset),
  ])

  const total = Number(totalCountResult[0]?.count || 0)
  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const parsed = createProfileSchema.safeParse(body)

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return apiError(firstIssue.message, StatusCodes.BAD_REQUEST)
  }

  const { name, aadhar_number, username, password, role, factory_id } = parsed.data
  const targetFactoryId = user.role === Role.SUPER_ADMIN && factory_id ? factory_id : user.factory_id

  // Check username uniqueness
  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, username))
  if (existingUser) return apiError("Username is already taken", StatusCodes.BAD_REQUEST)

  // Check aadhar uniqueness
  const [existingProfile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.aadharNumber, aadhar_number))
  if (existingProfile) return apiError("Aadhar number is already registered", StatusCodes.BAD_REQUEST)

  const passwordHash = await hashPassword(password)

  const [newUser] = await db
    .insert(users)
    .values({ username, passwordHash, role, factoryId: targetFactoryId })
    .returning()

  const [newProfile] = await db
    .insert(profiles)
    .values({ userId: newUser.id, name, aadharNumber: aadhar_number, role })
    .returning()

  return NextResponse.json({
    data: {
      id: newProfile.id,
      user_id: newProfile.userId,
      name: newProfile.name,
      aadhar_number: newProfile.aadharNumber,
      role: newProfile.role,
      username: newUser.username,
      factory_id: newUser.factoryId,
      is_active: newUser.isActive,
      created_at: newProfile.createdAt,
      updated_at: newProfile.updatedAt,
    },
  }, { status: StatusCodes.CREATED })
})
