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
import { type Entry } from "@/app/entries/types";

const ALLOWED_SORT_COLUMNS = [
  "id",
  "vehicle_number",
  "weight",
  "center",
  "customer",
  "source",
  "created_by",
  "created_at",
  "updated_at",
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pagination = parsePagination(searchParams);
    const sortRules = parseSorting(searchParams, ALLOWED_SORT_COLUMNS);

    const source = searchParams.get("source")?.trim().toLowerCase();
    const isSourceFiltered = source === "hardware" || source === "manual";

    // Use !inner join when filtering on creator role so PostgREST filters accurately
    const createdByUserJoin = isSourceFiltered
      ? "created_by_user:users!entries_created_by_fkey!inner(id, name, role)"
      : "created_by_user:users!entries_created_by_fkey(id, name, role)";

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
        ${createdByUserJoin}
      `,
        { count: "exact" },
      )
      .is("deleted_at", null);

    // Multi-field search across vehicle number, detected vehicle number, and numeric weight
    const search = searchParams.get("search")?.trim();
    if (search) {
      const numericStr = search.replace(/[, ]/g, "").replace(/kg$/i, "");
      const numericVal = Number(numericStr);
      const isNumeric = !isNaN(numericVal) && numericStr.length > 0 && numericVal > 0;

      if (isNumeric) {
        query = query.or(
          `vehicle_number.ilike.%${search}%,detected_vehicle_number.ilike.%${search}%,weight.eq.${numericVal}`,
        );
      } else {
        query = query.or(
          `vehicle_number.ilike.%${search}%,detected_vehicle_number.ilike.%${search}%`,
        );
      }
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

    const createdBy = searchParams.get("created_by")?.trim();
    if (createdBy && createdBy !== "all") {
      const parsedCreatedBy = Number(createdBy);
      if (!isNaN(parsedCreatedBy)) {
        query = query.eq("created_by", parsedCreatedBy);
      }
    }

    if (source === "hardware") {
      query = query.eq("created_by_user.role", "hardware");
    } else if (source === "manual") {
      query = query.neq("created_by_user.role", "hardware");
    }

    query = applyDateRange(query, searchParams);

    const hasRelationalSort = sortRules.some((r) =>
      ["center", "customer", "created_by", "source"].includes(r.col),
    );

    if (hasRelationalSort) {
      // Fetch matching set, sort in-memory alphabetically by related names, and slice page
      const { data, count, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: StatusCodes.INTERNAL_SERVER_ERROR },
        );
      }

      const entries = (data ?? []) as unknown as Entry[];

      entries.sort((a, b) => {
        for (const rule of sortRules) {
          let valA: string | number = "";
          let valB: string | number = "";

          if (rule.col === "center") {
            valA = a.center?.name ?? "";
            valB = b.center?.name ?? "";
          } else if (rule.col === "customer") {
            valA = a.customer?.name ?? "";
            valB = b.customer?.name ?? "";
          } else if (rule.col === "created_by") {
            valA = a.created_by_user?.name ?? "";
            valB = b.created_by_user?.name ?? "";
          } else if (rule.col === "source") {
            valA = a.created_by_user?.role === "hardware" ? "Hardware" : "Manual";
            valB = b.created_by_user?.role === "hardware" ? "Hardware" : "Manual";
          } else if (rule.col === "weight" || rule.col === "id") {
            valA = Number(a[rule.col as keyof Entry] ?? 0);
            valB = Number(b[rule.col as keyof Entry] ?? 0);
          } else {
            valA = String(a[rule.col as keyof Entry] ?? "");
            valB = String(b[rule.col as keyof Entry] ?? "");
          }

          let comparison = 0;
          if (typeof valA === "number" && typeof valB === "number") {
            comparison = valA - valB;
          } else {
            comparison = String(valA).localeCompare(String(valB));
          }

          if (comparison !== 0) {
            return rule.ascending ? comparison : -comparison;
          }
        }
        return 0;
      });

      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const sliced = entries.slice(startIndex, startIndex + pagination.pageSize);

      return NextResponse.json(formatPaginatedResponse(sliced, count, pagination));
    }

    // Standard native DB sorting & range pagination
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
