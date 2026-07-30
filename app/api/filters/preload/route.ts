import { NextResponse } from "next/server"
import { eq, asc } from "drizzle-orm"
import { commodities, factories, centers, profiles, customers, rates, users } from "@/db/schema"
import { withAuth, StatusCodes } from "@/db/helpers"
import { Role, TenantMode } from "@/lib/constants/enums"

/**
 * @file app/api/filters/preload/route.ts
 * @description Batch endpoint to preload all filter dropdown data in a single HTTP round-trip.
 * Runs all DB queries in parallel via Promise.all on the server, eliminating per-entity HTTP overhead.
 */

export const GET = withAuth(async (_req, user, db, mode) => {
  const isSuperAdmin = user.role === Role.SUPER_ADMIN

  if (mode === TenantMode.DEDICATED) {
    // Dedicated: no factory scoping anywhere
    const [commodityRows, centerRows, profileRows, customerRows, rateRows] = await Promise.all([
      db.select({ id: commodities.id, name: commodities.name }).from(commodities).orderBy(asc(commodities.name)),
      db.select({ id: centers.id, name: centers.name }).from(centers).orderBy(asc(centers.name)),
      db.select({ id: profiles.id, name: profiles.name }).from(profiles).orderBy(asc(profiles.name)),
      db.select({ id: customers.id, name: customers.name }).from(customers).orderBy(asc(customers.name)),
      db
        .select({
          id: rates.id,
          unit_price: rates.unitPrice,
          unit: rates.unit,
          commodity_name: commodities.name,
        })
        .from(rates)
        .leftJoin(commodities, eq(rates.commodityId, commodities.id))
        .orderBy(asc(rates.id)),
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
  }

  // Shared mode — factory scoping
  const factoryFilter = !isSuperAdmin && user.factory_id != null ? user.factory_id : null

  const [
    commodityRows,
    factoryRows,
    centerRows,
    profileRows,
    customerRows,
    rateRows,
  ] = await Promise.all([
    // Commodities — global, no factory scoping
    db
      .select({ id: commodities.id, name: commodities.name })
      .from(commodities)
      .orderBy(asc(commodities.name)),

    // Factories — only super admin sees all factories
    isSuperAdmin
      ? db
          .select({ id: factories.id, name: factories.name })
          .from(factories)
          .orderBy(asc(factories.name))
      : Promise.resolve([]),

    // Centers — scoped by factory if not super admin
    factoryFilter
      ? db
          .select({ id: centers.id, name: centers.name })
          .from(centers)
          .where(eq(centers.factoryId, factoryFilter))
          .orderBy(asc(centers.name))
      : db
          .select({ id: centers.id, name: centers.name })
          .from(centers)
          .orderBy(asc(centers.name)),

    // Profiles — scoped by factory via users join if not super admin
    factoryFilter
      ? db
          .select({ id: profiles.id, name: profiles.name })
          .from(profiles)
          .innerJoin(users, eq(profiles.userId, users.id))
          .where(eq(users.factoryId, factoryFilter))
          .orderBy(asc(profiles.name))
      : db
          .select({ id: profiles.id, name: profiles.name })
          .from(profiles)
          .orderBy(asc(profiles.name)),

    // Customers — scoped by factory if not super admin
    factoryFilter
      ? db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(eq(customers.factoryId, factoryFilter))
          .orderBy(asc(customers.name))
      : db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .orderBy(asc(customers.name)),

    // Rates — scoped by factory, join commodity and optionally factory name
    factoryFilter
      ? db
          .select({
            id: rates.id,
            unit_price: rates.unitPrice,
            unit: rates.unit,
            commodity_name: commodities.name,
            factory_name: factories.name,
          })
          .from(rates)
          .leftJoin(commodities, eq(rates.commodityId, commodities.id))
          .leftJoin(factories, eq(rates.factoryId, factories.id))
          .where(eq(rates.factoryId, factoryFilter))
          .orderBy(asc(rates.id))
      : db
          .select({
            id: rates.id,
            unit_price: rates.unitPrice,
            unit: rates.unit,
            commodity_name: commodities.name,
            factory_name: factories.name,
          })
          .from(rates)
          .leftJoin(commodities, eq(rates.commodityId, commodities.id))
          .leftJoin(factories, eq(rates.factoryId, factories.id))
          .orderBy(asc(rates.id)),
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
