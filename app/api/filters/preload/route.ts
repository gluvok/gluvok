import { NextResponse } from "next/server"
import { withAuth, StatusCodes } from "@/db/helpers"
import { TableName, EntityKey } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user, client) => {
  const factoryId = user.factory_id!

  const centersQuery = client
    .from(TableName.CENTERS)
    .select(`${EntityKey.ID}, ${EntityKey.NAME}`)
    .eq(EntityKey.FACTORY_ID, factoryId)
    .order(EntityKey.NAME, { ascending: true })

  const profilesQuery = client
    .from(TableName.PROFILES)
    .select(`${EntityKey.ID}, ${EntityKey.NAME}`)
    .eq(EntityKey.FACTORY_ID, factoryId)
    .order(EntityKey.NAME, { ascending: true })

  const customersQuery = client
    .from(TableName.CUSTOMERS)
    .select(`${EntityKey.ID}, ${EntityKey.NAME}`)
    .eq(EntityKey.FACTORY_ID, factoryId)
    .order(EntityKey.NAME, { ascending: true })

  const ratesQuery = client
    .from(TableName.RATES)
    .select(`${EntityKey.ID}, ${EntityKey.UNIT_PRICE}, ${EntityKey.UNIT}, ${TableName.COMMODITIES}!left(${EntityKey.NAME})`)
    .eq(EntityKey.FACTORY_ID, factoryId)
    .order(EntityKey.ID, { ascending: true })

  const commoditiesQuery = client
    .from(TableName.COMMODITIES)
    .select(`${EntityKey.ID}, ${EntityKey.NAME}`)
    .order(EntityKey.NAME, { ascending: true })

  const [
    { data: commodityRows },
    { data: centerRows },
    { data: profileRows },
    { data: customerRows },
    { data: rateRows },
  ] = await Promise.all([
    commoditiesQuery,
    centersQuery,
    profilesQuery,
    customersQuery,
    ratesQuery,
  ])

  const formattedRates = (rateRows || []).map((r) => {
    const rawCommodity = (r as Record<string, unknown>)[TableName.COMMODITIES]
    const commodity_name = Array.isArray(rawCommodity)
      ? (rawCommodity[0] as { name?: string })?.name
      : (rawCommodity as { name?: string } | null)?.name
    return {
      [EntityKey.ID]: r.id,
      [EntityKey.UNIT_PRICE]: r.unit_price,
      [EntityKey.UNIT]: r.unit,
      [EntityKey.COMMODITY_NAME]: commodity_name || null,
    }
  })

  return NextResponse.json(
    {
      [TableName.COMMODITIES]: commodityRows || [],
      [TableName.FACTORIES]: [],
      [TableName.CENTERS]: centerRows || [],
      [TableName.PROFILES]: profileRows || [],
      [TableName.CUSTOMERS]: customerRows || [],
      [TableName.RATES]: formattedRates,
    },
    { status: StatusCodes.OK }
  )
})
