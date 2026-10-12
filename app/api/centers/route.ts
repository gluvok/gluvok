import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get("factory_id");
    const search = searchParams.get("search");

    let query = supabase
      .from("centers")
      .select("id, name, auto_approve, factory_id, created_at, updated_at")
      .is("deleted_at", null)
      .order("id", { ascending: true });

    if (factoryId) {
      const parsedFactoryId = parseInt(factoryId, 10);
      if (!isNaN(parsedFactoryId)) {
        query = query.eq("factory_id", parsedFactoryId);
      }
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
