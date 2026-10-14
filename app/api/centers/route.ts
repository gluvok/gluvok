import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_SORT_COLUMNS = ["id", "name", "created_at", "updated_at"] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("pageSize") || "10", 10) || 10),
    );
    const offset = (page - 1) * pageSize;

    // 2. Multi-column sorting parameters (strict delimited format: "col1.asc,col2.desc")
    const requestedSort = searchParams.get("sort")?.trim();
    const sortRules: { col: (typeof ALLOWED_SORT_COLUMNS)[number]; ascending: boolean }[] = [];

    if (requestedSort) {
      const parts = requestedSort.split(",");
      for (const part of parts) {
        const [colName, dir] = part.split(/[.:]/);
        const trimmedCol = colName?.trim();
        if (ALLOWED_SORT_COLUMNS.includes(trimmedCol as (typeof ALLOWED_SORT_COLUMNS)[number])) {
          const isAsc = dir?.trim().toLowerCase() !== "desc";
          sortRules.push({
            col: trimmedCol as (typeof ALLOWED_SORT_COLUMNS)[number],
            ascending: isAsc,
          });
        }
      }
    }

    // Default fallback: id descending
    if (sortRules.length === 0) {
      sortRules.push({ col: "id", ascending: false });
    }

    // 3. Build Supabase query with exact total count
    let query = supabase
      .from("centers")
      .select("id, name, created_at, updated_at", { count: "exact" })
      .is("deleted_at", null);

    // Apply active server-side filters dynamically in a loop
    const filterHandlers: Record<string, (val: string) => void> = {
      search: (val) => {
        query = query.ilike("name", `%${val}%`);
      },
      from: (val) => {
        const fromDate = new Date(val);
        if (!isNaN(fromDate.getTime())) {
          query = query.gte("created_at", fromDate.toISOString());
        }
      },
      to: (val) => {
        const toDate = new Date(val);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query = query.lte("created_at", toDate.toISOString());
        }
      },
    };

    for (const [key, rawValue] of searchParams.entries()) {
      const val = rawValue.trim();
      if (!val) continue;
      filterHandlers[key]?.(val);
    }

    // Apply multi-sorting rules sequentially
    for (const rule of sortRules) {
      query = query.order(rule.col, { ascending: rule.ascending });
    }

    // Apply pagination range slice
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return NextResponse.json({
      data: data ?? [],
      totalCount,
      page,
      pageSize,
      totalPages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
