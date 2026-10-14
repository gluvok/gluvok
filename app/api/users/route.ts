import { NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
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
  type User,
} from "@/app/users/types";

const ALLOWED_SORT_COLUMNS = [
  "id",
  "username",
  "name",
  "father_name",
  "role",
  "created_at",
  "updated_at",
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pagination = parsePagination(searchParams);
    const sortRules = parseSorting(searchParams, ALLOWED_SORT_COLUMNS);

    const executeQuery = async () => {
      let q = supabase
        .from("users")
        .select("id, username, name, father_name, role, factory_id, created_at, updated_at", {
          count: "exact",
        })
        .is("deleted_at", null);

      const search = searchParams.get("search")?.trim();
      if (search) {
        q = q.or(`name.ilike.%${search}%,username.ilike.%${search}%,father_name.ilike.%${search}%`);
      }

      const role = searchParams.get("role")?.trim();
      if (role && USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
        q = q.eq("role", role);
      } else {
        q = q.not("role", "in", '("customer","hardware")');
      }

      q = applyDateRange(q, searchParams);
      q = applySortingAndPagination(q, sortRules, pagination);

      const res = await q;
      if (!res.error) {
        return res;
      }

      // If father_name or role_enum customer is not yet migrated, fall back gracefully
      if (res.error.message.includes("father_name") || res.error.message.includes("role_enum")) {
        if (role === "customer") {
          return { data: [] as User[], count: 0, error: null };
        }
        let fallbackQ = supabase
          .from("users")
          .select("id, username, name, role, factory_id, created_at, updated_at", {
            count: "exact",
          })
          .is("deleted_at", null);

        if (search) {
          fallbackQ = fallbackQ.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
        }
        if (role && USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
          fallbackQ = fallbackQ.eq("role", role);
        } else {
          fallbackQ = fallbackQ.neq("role", "hardware");
        }
        fallbackQ = applyDateRange(fallbackQ, searchParams);
        fallbackQ = applySortingAndPagination(fallbackQ, sortRules, pagination);
        return await fallbackQ;
      }

      return res;
    };

    const result = await executeQuery();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    return NextResponse.json(
      formatPaginatedResponse<User>(result.data as User[] | null, result.count, pagination),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: StatusCodes.INTERNAL_SERVER_ERROR });
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
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    const { username, name, father_name, role, password } = validation.data;

    // Check username uniqueness among active users
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .is("deleted_at", null)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `Username "${username}" is already taken by an active account.` },
        { status: StatusCodes.CONFLICT },
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
        father_name: father_name?.trim() || null,
        role,
        password_hash: passwordHash,
        factory_id: 1,
      })
      .select("id, username, name, father_name, role, factory_id, created_at, updated_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    return NextResponse.json(
      {
        data: created,
        message:
          role === "customer" ? "Customer created successfully." : "User created successfully.",
      },
      { status: StatusCodes.CREATED },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: StatusCodes.INTERNAL_SERVER_ERROR });
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
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    const { id, username, name, father_name, role, password } = validation.data;

    // Verify user exists and is active
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id, username, role")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found or has already been deleted." },
        { status: StatusCodes.NOT_FOUND },
      );
    }

    // Role safety enforcement
    if (existingUser.role === "hardware") {
      return NextResponse.json(
        { error: "Hardware accounts cannot be modified via API." },
        { status: StatusCodes.FORBIDDEN },
      );
    }

    if (existingUser.role === "customer" && role && role !== "customer") {
      return NextResponse.json(
        { error: "Customer accounts cannot be upgraded to staff roles." },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    if (existingUser.role !== "customer" && role === "customer") {
      return NextResponse.json(
        { error: "Staff accounts cannot be converted to customer accounts." },
        { status: StatusCodes.BAD_REQUEST },
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
        return NextResponse.json(
          { error: conflictErr.message },
          { status: StatusCodes.INTERNAL_SERVER_ERROR },
        );
      }

      if (conflict) {
        return NextResponse.json(
          { error: `Username "${username}" is already in use by another active account.` },
          { status: StatusCodes.CONFLICT },
        );
      }
    }

    const updates: Record<string, unknown> = {
      username,
      name,
      updated_at: new Date().toISOString(),
    };

    if (father_name !== undefined) {
      updates.father_name = father_name.trim() || null;
    }

    if (role && role !== existingUser.role) {
      updates.role = role;
    }

    if (password && password.trim().length >= 6) {
      updates.password_hash = await argon2.hash(password);
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, username, name, father_name, role, factory_id, created_at, updated_at")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    return NextResponse.json({
      data: updated,
      message: "Account updated successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: StatusCodes.INTERNAL_SERVER_ERROR });
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
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    const targetIds = "ids" in validation.data ? validation.data.ids : [validation.data.id];

    // Retrieve active target users with role
    const { data: targetUsers, error: fetchErr } = await supabase
      .from("users")
      .select("id, username, role")
      .in("id", targetIds)
      .is("deleted_at", null);

    if (fetchErr) {
      return NextResponse.json(
        { error: fetchErr.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No active users found matching the specified ID(s)." },
        { status: StatusCodes.NOT_FOUND },
      );
    }

    // Partition target IDs into staff and customers
    const staffIds = targetUsers.filter((u) => u.role !== "customer").map((u) => u.id);
    const customerIds = targetUsers.filter((u) => u.role === "customer").map((u) => u.id);

    // Pre-flight checks: batch queries per domain
    const [entriesCreatedRes, ticketsRes, customerEntriesRes] = await Promise.all([
      staffIds.length > 0
        ? supabase
            .from("entries")
            .select("created_by")
            .in("created_by", staffIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [] }),
      staffIds.length > 0
        ? supabase.from("tickets").select("user_id").in("user_id", staffIds).is("deleted_at", null)
        : Promise.resolve({ data: [] }),
      customerIds.length > 0
        ? supabase
            .from("entries")
            .select("customer_id")
            .in("customer_id", customerIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [] }),
    ]);

    // Aggregate counts in memory
    const entriesCreatedCounts: Record<number, number> = {};
    for (const r of entriesCreatedRes.data ?? []) {
      entriesCreatedCounts[r.created_by] = (entriesCreatedCounts[r.created_by] || 0) + 1;
    }

    const ticketsCounts: Record<number, number> = {};
    for (const r of ticketsRes.data ?? []) {
      ticketsCounts[r.user_id] = (ticketsCounts[r.user_id] || 0) + 1;
    }

    const customerEntriesCounts: Record<number, number> = {};
    for (const r of customerEntriesRes.data ?? []) {
      if (r.customer_id) {
        customerEntriesCounts[r.customer_id] = (customerEntriesCounts[r.customer_id] || 0) + 1;
      }
    }

    const blockedUsers: { id: number; username: string; reasons: string[] }[] = [];

    for (const u of targetUsers) {
      const reasons: string[] = [];

      if (u.role === "customer") {
        const custEntries = customerEntriesCounts[u.id] || 0;
        if (custEntries > 0) reasons.push(`${custEntries} linked entry(s)`);
      } else {
        const createdCount = entriesCreatedCounts[u.id] || 0;
        const tickCount = ticketsCounts[u.id] || 0;
        if (createdCount > 0) reasons.push(`${createdCount} entry(s) created`);
        if (tickCount > 0) reasons.push(`${tickCount} ticket(s)`);
      }

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
          error: `Cannot delete account(s): ${details}. Historical operational records must be preserved.`,
          blockedUsers,
        },
        { status: StatusCodes.CONFLICT },
      );
    }

    // Soft-delete: set deleted_at and updated_at
    const now = new Date().toISOString();
    const { error: deleteErr } = await supabase
      .from("users")
      .update({ deleted_at: now, updated_at: now })
      .in("id", targetIds);

    if (deleteErr) {
      return NextResponse.json(
        { error: deleteErr.message },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${targetIds.length} account${targetIds.length > 1 ? "s" : ""}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: StatusCodes.INTERNAL_SERVER_ERROR });
  }
}
