import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { updateFactorySchema } from "@/app/settings/types";

/**
 * Hardcoded factory ID for single-tenant / current-tenant preview.
 * When session authentication is introduced, this will be retrieved from the user's session context.
 */
const HARDCODED_FACTORY_ID = 1;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("factories")
      .select("id, name, check_center_on_merge, receipt_images_per_row, created_at, updated_at")
      .eq("id", HARDCODED_FACTORY_ID)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Factory not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const parseResult = updateFactorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    const updates = {
      ...parseResult.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("factories")
      .update(updates)
      .eq("id", HARDCODED_FACTORY_ID)
      .is("deleted_at", null)
      .select("id, name, check_center_on_merge, receipt_images_per_row, created_at, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to update factory" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
