import { NextResponse } from "next/server"
import { eq, asc } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema"
import { withAuth, StatusCodes } from "@/db/helpers"
import { TenantMode } from "@/lib/constants/enums"

/**
 * @file app/api/filters/preload/route.ts
 * @description Batch endpoint to preload all filter dropdown data in a single HTTP round-trip.
 * Runs all DB queries in parallel via Promise.all on the server, dynamically scoped by TenantMode.
 */

export const GET = withAuth(async (_req, user, db, mode) => {
  const isShared = mode === TenantMode.SHARED
  const factoryFilter = isShared && user.factory_id != null ? user.factory_id : null

  const { centers, profiles, customers, rates, commodities, users } = getTables(mode)

  let centersQuery = db.select({ id: centers.id, name: centers.name }).from(centers).$dynamic()
  if (isShared && factoryFilter && sharedSchema.centers.factory_id) {
    centersQuery = centersQuery.where(eq(sharedSchema.centers.factory_id, factoryFilter)) as typeof centersQuery
  }

  let profilesQuery = db
    .select({ id: profiles.id, name: users.name })
    .from(profiles)
    .innerJoin(users, eq(profiles.user_id, users.id))
    .$dynamic()
  if (isShared && factoryFilter && sharedSchema.users.factory_id) {
    profilesQuery = profilesQuery.where(eq(sharedSchema.users.factory_id, factoryFilter)) as typeof profilesQuery
  }

  let customersQuery = db.select({ id: customers.id, name: customers.name }).from(customers).$dynamic()
  if (isShared && factoryFilter && sharedSchema.customers.factory_id) {
    customersQuery = customersQuery.where(eq(sharedSchema.customers.factory_id, factoryFilter)) as typeof customersQuery
  }

  let ratesQuery = db
    .select({
      id: rates.id,
      unit_price: rates.unit_price,
      unit: rates.unit,
      commodity_name: commodities.name,
    })
    .from(rates)
    .leftJoin(commodities, eq(rates.commodity_id, commodities.id))
    .$dynamic()

  if (isShared && factoryFilter && sharedSchema.rates.factory_id) {
    ratesQuery = ratesQuery.where(eq(sharedSchema.rates.factory_id, factoryFilter)) as typeof ratesQuery
  }

  const [commodityRows, centerRows, profileRows, customerRows, rateRows] = await Promise.all([
    db.select({ id: commodities.id, name: commodities.name }).from(commodities).orderBy(asc(commodities.name)),
    centersQuery.orderBy(asc(centers.name)),
    profilesQuery.orderBy(asc(users.name)),
    customersQuery.orderBy(asc(customers.name)),
    ratesQuery.orderBy(asc(rates.id)),
  ])

  return NextResponse.json(
    {
      commodities: commodityRows,
      factories: [],
      centers: centerRows,
      profiles: profileRows,
      customers: customerRows,
      rates: rateRows,
    },
    { status: StatusCodes.OK }
  )
})
