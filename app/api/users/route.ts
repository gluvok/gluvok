import { NextResponse } from "next/server";
import argon2 from "argon2";
import { supabase } from "@/lib/supabase";
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

    // 3. Build Supabase query with exact total count excluding password_hash
    let query = supabase
      .from("users")
      .select("id, username, name, role, factory_id, created_at, updated_at", { count: "exact" })
      .is("deleted_at", null);

    // Apply active server-side filters dynamically
    const filterHandlers: Record<string, (val: string) => void> = {
      search: (val) => {
        query = query.or(`name.ilike.%${val}%,username.ilike.%${val}%`);
      },
      role: (val) => {
        if (USER_ROLES.includes(val as (typeof USER_ROLES)[number])) {
          query = query.eq("role", val);
        }
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

    // Pre-flight check: verify none of the target users have linked records
    const blockedUsers: { id: number; username: string; reasons: string[] }[] = [];

    for (const u of targetUsers) {
      const [entriesCreated, entriesApproved, tickets, customers] = await Promise.all([
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("created_by", u.id)
          .is("deleted_at", null),
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("approved_by", u.id)
          .is("deleted_at", null),
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.id)
          .is("deleted_at", null),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.id)
          .is("deleted_at", null),
      ]);

      const reasons: string[] = [];
      const ec = entriesCreated.count || 0;
      const ea = entriesApproved.count || 0;
      const tc = tickets.count || 0;
      const cc = customers.count || 0;

      if (ec > 0) reasons.push(`${ec} entry(s) created`);
      if (ea > 0) reasons.push(`${ea} entry(s) approved`);
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
