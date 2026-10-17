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
import { type ManualEntry } from "@/app/entries/types";

const ALLOWED_SORT_COLUMNS = [
  "id",
  "vehicle_number",
  "weight",
  "center",
  "customer",
  "created_by",
  "created_at",
  "updated_at",
] as const;

async function queryLegacyManualEntries(
  searchParams: URLSearchParams,
  pagination: ReturnType<typeof parsePagination>,
  sortRules: ReturnType<typeof parseSorting>,
) {
  const { data: hwUsers } = await supabase.from("users").select("id").eq("role", "hardware");
  const hwIds = (hwUsers || []).map((u) => u.id);

  let query = supabase
    .from("entries")
    .select(
      `
        id,
        center_id,
        customer_id,
        created_by,
        vehicle_number,
        weight,
        images,
        created_at,
        updated_at,
        center:centers(id, name),
        customer:users!entries_customer_id_fkey(id, name),
        created_by_user:users!entries_created_by_fkey(id, name, role)
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (hwIds.length > 0) {
    query = query.not("created_by", "in", `(${hwIds.join(",")})`);
  }

  const search = searchParams.get("search")?.trim();
  if (search) {
    const numericStr = search.replace(/[, ]/g, "").replace(/kg$/i, "");
    const numericVal = Number(numericStr);
    const isNumeric = !isNaN(numericVal) && numericStr.length > 0 && numericVal > 0;

    if (isNumeric) {
      query = query.or(`vehicle_number.ilike.%${search}%,weight.eq.${numericVal}`);
    } else {
      query = query.ilike("vehicle_number", `%${search}%`);
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

  query = applyDateRange(query, searchParams);

  const hasRelationalSort = sortRules.some((r) =>
    ["center", "customer", "created_by"].includes(r.col),
  );

  if (hasRelationalSort) {
    const { data, count, error } = await query;
    if (error) throw error;
    const entries = (data ?? []) as unknown as ManualEntry[];

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
        } else if (rule.col === "weight" || rule.col === "id") {
          valA = Number(a[rule.col as keyof ManualEntry] ?? 0);
          valB = Number(b[rule.col as keyof ManualEntry] ?? 0);
        } else {
          valA = String(a[rule.col as keyof ManualEntry] ?? "");
          valB = String(b[rule.col as keyof ManualEntry] ?? "");
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
  return { data: (data ?? []) as unknown as ManualEntry[], count };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pagination = parsePagination(searchParams);
    const sortRules = parseSorting(searchParams, ALLOWED_SORT_COLUMNS);

    let query = supabase
      .from("manual_entries")
      .select(
        `
          id,
          center_id,
          customer_id,
          created_by,
          vehicle_number,
          weight,
          images,
          created_at,
          updated_at,
          center:centers(id, name),
          customer:users!manual_entries_customer_id_fkey(id, name),
          created_by_user:users!manual_entries_created_by_fkey(id, name, role)
        `,
        { count: "exact" },
      )
      .is("deleted_at", null);

    // Multi-field search across vehicle number and numeric weight ONLY (no detected vehicle number)
    const search = searchParams.get("search")?.trim();
    if (search) {
      const numericStr = search.replace(/[, ]/g, "").replace(/kg$/i, "");
      const numericVal = Number(numericStr);
      const isNumeric = !isNaN(numericVal) && numericStr.length > 0 && numericVal > 0;

      if (isNumeric) {
        query = query.or(`vehicle_number.ilike.%${search}%,weight.eq.${numericVal}`);
      } else {
        query = query.ilike("vehicle_number", `%${search}%`);
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

    query = applyDateRange(query, searchParams);

    const hasRelationalSort = sortRules.some((r) =>
      ["center", "customer", "created_by"].includes(r.col),
    );

    if (hasRelationalSort) {
      const { data, count, error } = await query;

      if (error) {
        if (error.code === "PGRST205") {
          const fallback = await queryLegacyManualEntries(searchParams, pagination, sortRules);
          return NextResponse.json(
            formatPaginatedResponse(fallback.data, fallback.count, pagination),
            { status: StatusCodes.OK },
          );
        }
        throw error;
      }

      const entries = (data ?? []) as unknown as ManualEntry[];

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
          } else if (rule.col === "weight" || rule.col === "id") {
            valA = Number(a[rule.col as keyof ManualEntry] ?? 0);
            valB = Number(b[rule.col as keyof ManualEntry] ?? 0);
          } else {
            valA = String(a[rule.col as keyof ManualEntry] ?? "");
            valB = String(b[rule.col as keyof ManualEntry] ?? "");
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
        const fallback = await queryLegacyManualEntries(searchParams, pagination, sortRules);
        return NextResponse.json(
          formatPaginatedResponse(fallback.data, fallback.count, pagination),
          { status: StatusCodes.OK },
        );
      }
      throw error;
    }

    return NextResponse.json(
      formatPaginatedResponse((data ?? []) as unknown as ManualEntry[], count, pagination),
      { status: StatusCodes.OK },
    );
  } catch (error) {
    console.error("GET /api/entries/manual error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}
