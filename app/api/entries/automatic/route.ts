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
import { type AutomaticEntry } from "@/app/entries/types";

const ALLOWED_SORT_COLUMNS = [
  "id",
  "vehicle_number",
  "detected_vehicle_number",
  "weight",
  "center",
  "customer",
  "created_at",
  "updated_at",
] as const;

async function queryLegacyAutomaticEntries(
  searchParams: URLSearchParams,
  pagination: ReturnType<typeof parsePagination>,
  sortRules: ReturnType<typeof parseSorting>,
) {
  const { data: hwUsers } = await supabase.from("users").select("id").eq("role", "hardware");
  const hwIds = (hwUsers || []).map((u) => u.id);

  if (hwIds.length === 0) {
    return { data: [], count: 0 };
  }

  let query = supabase
    .from("entries")
    .select(
      `
        id,
        center_id,
        customer_id,
        created_by,
        detected_vehicle_number,
        vehicle_number,
        weight,
        images,
        created_at,
        updated_at,
        center:centers(id, name),
        customer:users!entries_customer_id_fkey(id, name)
      `,
      { count: "exact" },
    )
    .is("deleted_at", null)
    .in("created_by", hwIds);

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

  query = applyDateRange(query, searchParams);

  const hasRelationalSort = sortRules.some((r) => ["center", "customer"].includes(r.col));

  if (hasRelationalSort) {
    const { data, count, error } = await query;
    if (error) throw error;
    const entries = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((e) => ({
      ...e,
      device_id: Number(e.created_by),
      device: { id: Number(e.created_by) },
    })) as unknown as AutomaticEntry[];

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
        } else if (rule.col === "weight" || rule.col === "id") {
          valA = Number(a[rule.col as keyof AutomaticEntry] ?? 0);
          valB = Number(b[rule.col as keyof AutomaticEntry] ?? 0);
        } else {
          valA = String(a[rule.col as keyof AutomaticEntry] ?? "");
          valB = String(b[rule.col as keyof AutomaticEntry] ?? "");
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
    return { data: sliced, count };
  }

  query = applySortingAndPagination(query, sortRules, pagination);
  const { data, count, error } = await query;
  if (error) throw error;
  const mapped = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((e) => ({
    ...e,
    device_id: Number(e.created_by),
    device: { id: Number(e.created_by) },
  })) as unknown as AutomaticEntry[];
  return { data: mapped, count };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pagination = parsePagination(searchParams);
    const sortRules = parseSorting(searchParams, ALLOWED_SORT_COLUMNS);

    let query = supabase
      .from("automatic_entries")
      .select(
        `
          id,
          device_id,
          center_id,
          customer_id,
          detected_vehicle_number,
          vehicle_number,
          weight,
          images,
          created_at,
          updated_at,
          center:centers(id, name),
          customer:users!automatic_entries_customer_id_fkey(id, name),
          device:devices!automatic_entries_device_id_fkey(id)
        `,
        { count: "exact" },
      )
      .is("deleted_at", null);

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

    query = applyDateRange(query, searchParams);

    const hasRelationalSort = sortRules.some((r) => ["center", "customer"].includes(r.col));

    if (hasRelationalSort) {
      const { data, count, error } = await query;

      if (error) {
        if (error.code === "PGRST205") {
          const fallback = await queryLegacyAutomaticEntries(searchParams, pagination, sortRules);
          return NextResponse.json(
            formatPaginatedResponse(fallback.data, fallback.count, pagination),
            { status: StatusCodes.OK },
          );
        }
        throw error;
      }

      const entries = (data ?? []) as unknown as AutomaticEntry[];

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
          } else if (rule.col === "weight" || rule.col === "id") {
            valA = Number(a[rule.col as keyof AutomaticEntry] ?? 0);
            valB = Number(b[rule.col as keyof AutomaticEntry] ?? 0);
          } else {
            valA = String(a[rule.col as keyof AutomaticEntry] ?? "");
            valB = String(b[rule.col as keyof AutomaticEntry] ?? "");
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

      return NextResponse.json(formatPaginatedResponse(sliced, count, pagination), {
        status: StatusCodes.OK,
      });
    }

    query = applySortingAndPagination(query, sortRules, pagination);

    const { data, count, error } = await query;

    if (error) {
      if (error.code === "PGRST205") {
        const fallback = await queryLegacyAutomaticEntries(searchParams, pagination, sortRules);
        return NextResponse.json(
          formatPaginatedResponse(fallback.data, fallback.count, pagination),
          { status: StatusCodes.OK },
        );
      }
      throw error;
    }

    return NextResponse.json(
      formatPaginatedResponse((data ?? []) as unknown as AutomaticEntry[], count, pagination),
      { status: StatusCodes.OK },
    );
  } catch (error) {
    console.error("GET /api/entries/automatic error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}
