import { NextResponse } from "next/server"
import { withAuth, StatusCodes } from "@/db/helpers"
import { TableName } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user, client) => {
  const factoryId = user.factory_id ?? null

  let centersQuery = client.from(TableName.CENTERS).select("id, name").order("name", { ascending: true })
  let profilesQuery = client.from(TableName.PROFILES).select("id, name").order("name", { ascending: true })
  let customersQuery = client.from(TableName.CUSTOMERS).select("id, name").order("name", { ascending: true })
  let ratesQuery = client.from(TableName.RATES).select("id, unit_price, unit, commodities!left(name)").order("id", { ascending: true })
  let commoditiesQuery = client.from(TableName.COMMODITIES).select("id, name").order("name", { ascending: true })

  if (factoryId) {
    centersQuery = centersQuery.eq("factory_id", factoryId)
    profilesQuery = profilesQuery.eq("factory_id", factoryId)
    customersQuery = customersQuery.eq("factory_id", factoryId)
    ratesQuery = ratesQuery.eq("factory_id", factoryId)
    commoditiesQuery = commoditiesQuery.eq("factory_id", factoryId)
  }

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
    const rawCommodity = r.commodities
    const commodity_name = Array.isArray(rawCommodity)
      ? rawCommodity[0]?.name
      : (rawCommodity as { name?: string } | null)?.name
    return {
      id: r.id,
      unit_price: r.unit_price,
      unit: r.unit,
      commodity_name: commodity_name || null,
    }
  })

  return NextResponse.json(
    {
      commodities: commodityRows || [],
      factories: [],
      centers: centerRows || [],
      profiles: profileRows || [],
      customers: customerRows || [],
      rates: formattedRates,
    },
    { status: StatusCodes.OK }
  )
})
