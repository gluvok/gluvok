import { eq, ilike, and, desc, or, count } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema"
import { withAuth, getPaginationParams, apiError, forbiddenError, hasPermission, StatusCodes, getFactoryConfig, getFactoryWhereClause, fetchPaginatedResult, formatEntityResponse } from "@/db/helpers"
import { Role, TenantMode, ProjectSlug, PermissionKey, QueryParam, FieldRequirementMode } from "@/lib/constants/enums"
import { hashPassword } from "@/lib/auth/password"
import { getDynamicCustomerSchema } from "@/lib/validation"

export const GET = withAuth(async (req, user, db, mode) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)

  const { customers, users } = getTables(mode)
  const factories = mode === TenantMode.SHARED ? sharedSchema.factories : undefined
  const isSuperAdminShared = mode === TenantMode.SHARED && user.role === Role.SUPER_ADMIN

  const activeConfig = await getFactoryConfig(user.factory_id, db, mode)
  const isGovtIdNotRequired = activeConfig?.govtIdMode === FieldRequirementMode.NOT_REQUIRED

  const factoryCond = getFactoryWhereClause(user, mode, sharedSchema.customers.factoryId, req.nextUrl.searchParams)
  const conditions = []
  if (factoryCond) conditions.push(factoryCond)

  if (search) {
    const searchNum = parseInt(search, 10)
    const searchConds = [
      ilike(customers.name, `%${search}%`),
      ilike(customers.fatherName, `%${search}%`),
    ]
    if (!isNaN(searchNum)) {
      searchConds.push(eq(customers.id, searchNum))
      if (!isGovtIdNotRequired) {
        searchConds.push(eq(customers.govtId, searchNum))
      }
    }
    if (isSuperAdminShared && factories) {
      searchConds.push(ilike(factories.name, `%${search}%`))
      if (!isNaN(searchNum)) {
        searchConds.push(eq(sharedSchema.customers.factoryId, searchNum))
      }
    }
    conditions.push(or(...searchConds))
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  let baseQuery = db
    .select({
      id: customers.id,
      ...(isGovtIdNotRequired ? {} : { govt_id: customers.govtId }),
      name: customers.name,
      father_name: customers.fatherName,
      user_id: customers.userId,
      ...(mode === TenantMode.SHARED ? { factory_id: sharedSchema.customers.factoryId } : {}),
      created_at: customers.createdAt,
      updated_at: customers.updatedAt,
      username: users.username,
      is_active: users.isActive,
      ...(isSuperAdminShared && factories ? { factory_name: factories.name } : {}),
    })
    .from(customers)
    .leftJoin(users, eq(customers.userId, users.id))
    .$dynamic()

  if (isSuperAdminShared && factories) {
    baseQuery = baseQuery.leftJoin(factories, eq(sharedSchema.customers.factoryId, factories.id)) as typeof baseQuery
  }

  let countQuery = db
    .select({ count: count() })
    .from(customers)
    .leftJoin(users, eq(customers.userId, users.id))
    .$dynamic()

  if (isSuperAdminShared && factories) {
    countQuery = countQuery.leftJoin(factories, eq(sharedSchema.customers.factoryId, factories.id)) as typeof countQuery
  }

  return fetchPaginatedResult(db, countQuery, baseQuery, whereClause, pagination, desc(customers.createdAt))
})

export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()

  const targetFactoryId = (mode === TenantMode.SHARED && user.role === Role.SUPER_ADMIN && body.factory_id)
    ? Number(body.factory_id)
    : (user.factory_id ?? 0)
  const activeConfig = await getFactoryConfig(targetFactoryId, db, mode)

  const dynamicSchema = getDynamicCustomerSchema(activeConfig)
  const parsed = dynamicSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST)
  }

  const { govt_id, name, father_name, username, password } = parsed.data as {
    govt_id?: number | null
    name: string
    father_name: string
    username?: string
    password?: string
  }

  const { customers, users } = getTables(mode)

  if (govt_id != null) {
    const existingConds = [eq(sharedSchema.customers.govtId, Number(govt_id))]
    if (mode === TenantMode.SHARED) existingConds.push(eq(sharedSchema.customers.factoryId, targetFactoryId))
    const [existingCustomer] = await db.select({ id: sharedSchema.customers.id }).from(customers).where(and(...existingConds))
    if (existingCustomer) {
      return apiError(mode === TenantMode.SHARED ? "Govt ID already exists in this factory" : "Govt ID already exists", StatusCodes.BAD_REQUEST)
    }
  }

  let createdUserId: string | null = null
  if (username && password) {
    const passwordHash = await hashPassword(password)
    const userValues = { username, passwordHash, role: Role.BASE, ...(mode === TenantMode.SHARED ? { factoryId: targetFactoryId } : {}) }
    const [newUser] = await db.insert(users as typeof sharedSchema.users).values(userValues as typeof sharedSchema.users.$inferInsert).returning()
    createdUserId = newUser.id
  }

  const customerValues = {
    ...(govt_id != null ? { govtId: Number(govt_id) } : {}),
    name,
    fatherName: father_name,
    userId: createdUserId,
    ...(mode === TenantMode.SHARED ? { factoryId: targetFactoryId } : {}),
  }

  const [newCustomer] = await db.insert(customers as typeof sharedSchema.customers).values(customerValues as typeof sharedSchema.customers.$inferInsert).returning()
  return formatEntityResponse(newCustomer, mode, StatusCodes.CREATED)
})
