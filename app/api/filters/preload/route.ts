import { NextResponse } from "next/server"
import { eq, asc } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema"
import { withAuth, StatusCodes } from "@/db/helpers"
import { Role, TenantMode } from "@/lib/constants/enums"

/**
 * @file app/api/filters/preload/route.ts
 * @description Batch endpoint to preload all filter dropdown data in a single HTTP round-trip.
 * Runs all DB queries in parallel via Promise.all on the server, dynamically scoped by TenantMode.
 */

export const GET = withAuth(async (_req, user, db, mode) => {
  const isSuperAdmin = user.role === Role.SUPER_ADMIN
  const isShared = mode === TenantMode.SHARED
  const factoryFilter = isShared && !isSuperAdmin && user.factory_id != null ? user.factory_id : null

  const { centers, profiles, customers, rates, commodities, users } = getTables(mode)
  const factories = isShared ? sharedSchema.factories : undefined

  let centersQuery = db.select({ id: centers.id, name: centers.name }).from(centers).$dynamic()
  if (isShared && factoryFilter && sharedSchema.centers.factoryId) {
    centersQuery = centersQuery.where(eq(sharedSchema.centers.factoryId, factoryFilter)) as typeof centersQuery
  }

  let profilesQuery = db.select({ id: profiles.id, name: profiles.name }).from(profiles).$dynamic()
  if (isShared && factoryFilter && sharedSchema.users.factoryId) {
    profilesQuery = profilesQuery
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(sharedSchema.users.factoryId, factoryFilter)) as typeof profilesQuery
  }

  let customersQuery = db.select({ id: customers.id, name: customers.name }).from(customers).$dynamic()
  if (isShared && factoryFilter && sharedSchema.customers.factoryId) {
    customersQuery = customersQuery.where(eq(sharedSchema.customers.factoryId, factoryFilter)) as typeof customersQuery
  }

  let ratesQuery = db
    .select({
      id: rates.id,
      unit_price: rates.unitPrice,
      unit: rates.unit,
      commodity_name: commodities.name,
      ...(isShared && isSuperAdmin && factories ? { factory_name: factories.name } : {}),
    })
    .from(rates)
    .leftJoin(commodities, eq(rates.commodityId, commodities.id))
    .$dynamic()

  if (isShared && isSuperAdmin && factories) {
    ratesQuery = ratesQuery.leftJoin(factories, eq(sharedSchema.rates.factoryId, factories.id)) as typeof ratesQuery
  }
  if (isShared && factoryFilter && sharedSchema.rates.factoryId) {
    ratesQuery = ratesQuery.where(eq(sharedSchema.rates.factoryId, factoryFilter)) as typeof ratesQuery
  }

  const [commodityRows, factoryRows, centerRows, profileRows, customerRows, rateRows] = await Promise.all([
    db.select({ id: commodities.id, name: commodities.name }).from(commodities).orderBy(asc(commodities.name)),
    isShared && isSuperAdmin && factories
      ? db.select({ id: factories.id, name: factories.name }).from(factories).orderBy(asc(factories.name))
      : Promise.resolve([]),
    centersQuery.orderBy(asc(centers.name)),
    profilesQuery.orderBy(asc(profiles.name)),
    customersQuery.orderBy(asc(customers.name)),
    ratesQuery.orderBy(asc(rates.id)),
  ])

  return NextResponse.json(
    {
      commodities: commodityRows,
      factories: factoryRows,
      centers: centerRows,
      profiles: profileRows,
      customers: customerRows,
      rates: rateRows,
    },
    { status: StatusCodes.OK }
  )
})
