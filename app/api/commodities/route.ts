import { ilike, desc } from "drizzle-orm"
import { commodities } from "@/db/schema"
import { withAuth, getPaginationParams, validateRequiredFields, forbiddenError, hasPermission, StatusCodes, fetchPaginatedResult, formatEntityResponse } from "@/db/helpers"
import { ProjectSlug, QueryParam, PermissionKey } from "@/lib/constants/enums"

export const GET = withAuth(async (req, _user, db) => {
  const pagination = getPaginationParams(req.nextUrl)
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH)
  const whereClause = search ? ilike(commodities.name, `%${search}%`) : undefined

  const baseQuery = db
    .select({
      id: commodities.id,
      name: commodities.name,
      created_at: commodities.createdAt,
      updated_at: commodities.updatedAt,
    })
    .from(commodities)

  return fetchPaginatedResult(db, commodities, baseQuery, whereClause, pagination, desc(commodities.createdAt))
})

export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.COMMODITIES, PermissionKey.CREATE)) return forbiddenError()
  const body = await req.json()
  const err = validateRequiredFields(body, ProjectSlug.COMMODITIES)
  if (err) return err

  const { name } = body
  const [newCommodity] = await db.insert(commodities).values({ name }).returning()

  return formatEntityResponse(newCommodity, mode, StatusCodes.CREATED)
})
