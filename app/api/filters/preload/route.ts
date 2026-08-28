import { NextResponse } from "next/server";
import { withAuth, StatusCodes } from "@/db/helpers";
import { TableName } from "@/lib/constants/enums";

export const GET = withAuth(async (_req, user, client) => {
  const factoryId = user.factory_id;

  const centersQuery = client
    .from(TableName.CENTERS)
    .select("id, name")
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const usersQuery = client
    .from(TableName.USERS)
    .select("id, name")
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const customersQuery = client
    .from(TableName.CUSTOMERS)
    .select("id, name")
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const ratesQuery = client
    .from(TableName.RATES)
    .select(`id, unit_price, unit, ${TableName.COMMODITIES}!left(name)`)
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("id", { ascending: true });

  const commoditiesQuery = client
    .from(TableName.COMMODITIES)
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const [
    { data: commodityRows },
    { data: centerRows },
    { data: userRows },
    { data: customerRows },
    { data: rateRows },
  ] = await Promise.all([commoditiesQuery, centersQuery, usersQuery, customersQuery, ratesQuery]);

  const formattedRates = (rateRows || []).map((r) => {
    const rawCommodity = (r as Record<string, unknown>)[TableName.COMMODITIES];
    const commodity_name = Array.isArray(rawCommodity)
      ? (rawCommodity[0] as { name?: string })?.name
      : (rawCommodity as { name?: string } | null)?.name;
    return {
      id: r.id,
      unit_price: r.unit_price,
      unit: r.unit,
      commodity_name: commodity_name || null,
    };
  });

  return NextResponse.json(
    {
      [TableName.COMMODITIES]: commodityRows || [],
      [TableName.FACTORIES]: [],
      [TableName.CENTERS]: centerRows || [],
      [TableName.USERS]: userRows || [],
      [TableName.CUSTOMERS]: customerRows || [],
      [TableName.RATES]: formattedRates,
    },
    { status: StatusCodes.OK },
  );
});
