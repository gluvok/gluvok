import { NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { supabase } from "@/lib/supabase";
import {
  parsePagination,
  parseSorting,
  applyDateRange,
  applySortingAndPagination,
  formatPaginatedResponse,
} from "@/lib/api-query";

const ALLOWED_SORT_COLUMNS = [
  "id",
  "vehicle_number",
  "weight",
  "created_at",
  "updated_at",
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pagination = parsePagination(searchParams);
    const sortRules = parseSorting(searchParams, ALLOWED_SORT_COLUMNS);

    let query = supabase
      .from("entries")
      .select(
        `
        id,
        detected_vehicle_number,
        vehicle_number,
        weight,
        center_id,
        customer_id,
        factory_id,
        created_by,
        images,
        created_at,
        updated_at,
        center:centers(id, name),
        customer:users!entries_customer_id_fkey(id, name),
        created_by_user:users!entries_created_by_fkey(id, name)
      `,
        { count: "exact" },
      )
      .is("deleted_at", null);

    const search = searchParams.get("search")?.trim();
    if (search) {
      query = query.or(
        `vehicle_number.ilike.%${search}%,detected_vehicle_number.ilike.%${search}%`,
      );
    }

    const centerId = searchParams.get("center_id")?.trim();
    if (centerId && centerId !== "all") {
      const parsedCenterId = Number(centerId);
      if (!isNaN(parsedCenterId)) {
        query = query.eq("center_id", parsedCenterId);
      }
    }

    const customerId = searchParams.get("customer_id")?.trim();
    if (customerId && customerId !== "all") {
      const parsedCustomerId = Number(customerId);
      if (!isNaN(parsedCustomerId)) {
        query = query.eq("customer_id", parsedCustomerId);
      }
    }

    query = applyDateRange(query, searchParams);
    query = applySortingAndPagination(query, sortRules, pagination);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    return NextResponse.json(formatPaginatedResponse(data, count, pagination));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: StatusCodes.INTERNAL_SERVER_ERROR });
  }
}
