import { NextResponse } from "next/server";
import argon2 from "argon2";
import { supabase } from "@/lib/supabase";
import {
  parsePagination,
  parseSorting,
  applyDateRange,
  applySortingAndPagination,
  formatPaginatedResponse,
} from "@/lib/api-query";
import {
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  USER_ROLES,
} from "@/app/users/types";

const ALLOWED_SORT_COLUMNS = [
  "id",
  "username",
  "name",
  "role",
  "created_at",
  "updated_at",
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pagination = parsePagination(searchParams);
    const sortRules = parseSorting(searchParams, ALLOWED_SORT_COLUMNS);

    let query = supabase
      .from("users")
      .select("id, username, name, role, factory_id, created_at, updated_at", { count: "exact" })
      .is("deleted_at", null);

    const search = searchParams.get("search")?.trim();
    if (search) {
      query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const role = searchParams.get("role")?.trim();
    if (role && USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      query = query.eq("role", role);
    }

    query = applyDateRange(query, searchParams);
    query = applySortingAndPagination(query, sortRules, pagination);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(formatPaginatedResponse(data, count, pagination));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createUserSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { username, name, role, password } = validation.data;

    // Check username uniqueness among active users
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .is("deleted_at", null)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: `Username "${username}" is already taken by an active account.` },
        { status: 409 },
      );
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(password);

    // Insert user assigned to primary factory (id: 1)
    const { data: created, error: insertError } = await supabase
      .from("users")
      .insert({
        username,
        name,
        role,
        password_hash: passwordHash,
        factory_id: 1,
      })
      .select("id, username, name, role, factory_id, created_at, updated_at")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: created,
        message: "User created successfully.",
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = updateUserSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { id, username, name, role, password } = validation.data;

    // Verify user exists and is active
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found or has already been deleted." },
        { status: 404 },
      );
    }

    // If username changed, verify uniqueness among active users
    if (username !== existingUser.username) {
      const { data: conflict, error: conflictErr } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (conflictErr) {
        return NextResponse.json({ error: conflictErr.message }, { status: 500 });
      }

      if (conflict) {
        return NextResponse.json(
          { error: `Username "${username}" is already in use by another active account.` },
          { status: 409 },
        );
      }
    }

    const updates: Record<string, unknown> = {
      username,
      name,
      role,
      updated_at: new Date().toISOString(),
    };

    if (password && password.trim().length >= 6) {
      updates.password_hash = await argon2.hash(password);
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, username, name, role, factory_id, created_at, updated_at")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: updated,
      message: "User updated successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = deleteUserSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const targetIds = "ids" in validation.data ? validation.data.ids : [validation.data.id];

    // Retrieve active target users to get their usernames
    const { data: targetUsers, error: fetchErr } = await supabase
      .from("users")
      .select("id, username")
      .in("id", targetIds)
      .is("deleted_at", null);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No active users found matching the specified ID(s)." },
        { status: 404 },
      );
    }

    // Pre-flight check: verify none of the target users have linked records (O(1) batch queries)
    const [entriesCreatedRes, ticketsRes, customersRes] = await Promise.all([
      supabase
        .from("entries")
        .select("created_by")
        .in("created_by", targetIds)
        .is("deleted_at", null),
      supabase.from("tickets").select("user_id").in("user_id", targetIds).is("deleted_at", null),
      supabase.from("customers").select("user_id").in("user_id", targetIds).is("deleted_at", null),
    ]);

    // Aggregate counts in memory
    const entriesCounts: Record<number, number> = {};
    for (const r of entriesCreatedRes.data ?? []) {
      entriesCounts[r.created_by] = (entriesCounts[r.created_by] || 0) + 1;
    }

    const ticketsCounts: Record<number, number> = {};
    for (const r of ticketsRes.data ?? []) {
      ticketsCounts[r.user_id] = (ticketsCounts[r.user_id] || 0) + 1;
    }

    const customersCounts: Record<number, number> = {};
    for (const r of customersRes.data ?? []) {
      customersCounts[r.user_id] = (customersCounts[r.user_id] || 0) + 1;
    }

    const blockedUsers: { id: number; username: string; reasons: string[] }[] = [];

    for (const u of targetUsers) {
      const reasons: string[] = [];
      const ec = entriesCounts[u.id] || 0;
      const tc = ticketsCounts[u.id] || 0;
      const cc = customersCounts[u.id] || 0;

      if (ec > 0) reasons.push(`${ec} entry(s) created`);
      if (tc > 0) reasons.push(`${tc} ticket(s)`);
      if (cc > 0) reasons.push(`${cc} customer profile(s)`);

      if (reasons.length > 0) {
        blockedUsers.push({ id: u.id, username: u.username, reasons });
      }
    }

    if (blockedUsers.length > 0) {
      const details = blockedUsers
        .map((b) => `"${b.username}" (ID: ${b.id}) has ${b.reasons.join(", ")}`)
        .join("; ");
      return NextResponse.json(
        {
          error: `Cannot delete user(s): ${details}. Historical operational records must be preserved.`,
          blockedUsers,
        },
        { status: 409 },
      );
    }

    // Soft-delete: set deleted_at and updated_at
    const now = new Date().toISOString();
    const { error: deleteErr } = await supabase
      .from("users")
      .update({ deleted_at: now, updated_at: now })
      .in("id", targetIds);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${targetIds.length} user${targetIds.length > 1 ? "s" : ""}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
