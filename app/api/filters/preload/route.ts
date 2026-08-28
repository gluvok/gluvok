import { NextResponse } from "next/server";
import { withAuth, StatusCodes } from "@/db/helpers";

export const GET = withAuth(async (_req, user, client) => {
  const factoryId = user.factory_id;

  const centersQuery = client
    .from("centers")
    .select("id, name")
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const usersQuery = client
    .from("users")
    .select("id, name")
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const customersQuery = client
    .from("customers")
    .select("id, name")
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const ratesQuery = client
    .from("rates")
    .select(`id, unit_price, unit, commodities!left(name)`)
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .order("id", { ascending: true });

  const commoditiesQuery = client
    .from("commodities")
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
    const rawCommodity = (r as Record<string, unknown>)["commodities"];
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
      commodities: commodityRows || [],
      factories: [],
      centers: centerRows || [],
      users: userRows || [],
      customers: customerRows || [],
      rates: formattedRates,
    },
    { status: StatusCodes.OK },
  );
});
