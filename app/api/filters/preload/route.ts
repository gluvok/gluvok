import { NextResponse } from "next/server"
import { withAuth, StatusCodes } from "@/db/helpers"
import { TableName, EntityKey } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user, client) => {
  const factoryId = user.factory_id!

  const centersQuery = client.from(TableName.CENTERS).select("id, name").eq(EntityKey.FACTORY_ID, factoryId).order("name", { ascending: true })
  const profilesQuery = client.from(TableName.PROFILES).select("id, name").eq(EntityKey.FACTORY_ID, factoryId).order("name", { ascending: true })
  const customersQuery = client.from(TableName.CUSTOMERS).select("id, name").eq(EntityKey.FACTORY_ID, factoryId).order("name", { ascending: true })
  const ratesQuery = client.from(TableName.RATES).select("id, unit_price, unit, commodities!left(name)").eq(EntityKey.FACTORY_ID, factoryId).order("id", { ascending: true })
  const commoditiesQuery = client.from(TableName.COMMODITIES).select("id, name").order("name", { ascending: true })

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
