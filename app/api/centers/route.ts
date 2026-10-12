import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_SORT_COLUMNS = ["id", "name", "auto_approve", "created_at", "updated_at"] as const;

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

    // 2. Filter parameters
    const search = searchParams.get("search")?.trim();
    const autoApprove = searchParams.get("auto_approve")?.trim().toLowerCase();
    const fromParam = searchParams.get("from")?.trim();
    const toParam = searchParams.get("to")?.trim();

    // 3. Sorting parameters
    const requestedSort = searchParams.get("sort")?.trim();
    const sortCol = ALLOWED_SORT_COLUMNS.includes(
      requestedSort as (typeof ALLOWED_SORT_COLUMNS)[number],
    )
      ? (requestedSort as (typeof ALLOWED_SORT_COLUMNS)[number])
      : "id";
    const isAscending = searchParams.get("order")?.toLowerCase() !== "desc";

    // 4. Build Supabase query with exact total count
    let query = supabase
      .from("centers")
      .select("id, name, auto_approve, created_at, updated_at", { count: "exact" })
      .is("deleted_at", null);

    // Server-side text search on center name
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Server-side auto_approve filter
    if (autoApprove === "true") {
      query = query.eq("auto_approve", true);
    } else if (autoApprove === "false") {
      query = query.eq("auto_approve", false);
    }

    // Server-side date range filter on created_at
    if (fromParam) {
      const fromDate = new Date(fromParam);
      if (!isNaN(fromDate.getTime())) {
        query = query.gte("created_at", fromDate.toISOString());
      }
    }
    if (toParam) {
      const toDate = new Date(toParam);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", toDate.toISOString());
      }
    }

    // Apply sorting and range slice
    query = query.order(sortCol, { ascending: isAscending }).range(offset, offset + pageSize - 1);

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
