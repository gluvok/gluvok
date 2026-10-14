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
  USER_ROLES,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/app/users/types";

export const ALLOWED_SORT_COLUMNS = [
  "id",
  "username",
  "name",
  "role",
  "created_at",
  "updated_at",
] as const;

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * Fetches a paginated, sorted, and filtered list of users.
 * Hardware accounts are strictly excluded from results and cannot be filtered by.
 */
export async function fetchUsersList(searchParams: URLSearchParams) {
  const pagination = parsePagination(searchParams);
  const sortRules = parseSorting(searchParams, ALLOWED_SORT_COLUMNS);

  let q = supabase
    .from("users")
    .select("id, username, name, role, factory_id, created_at, updated_at", {
      count: "exact",
    })
    .is("deleted_at", null);

  const search = searchParams.get("search")?.trim();
  if (search) {
    q = q.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
  }

  const role = searchParams.get("role")?.trim();
  // Strictly forbid filtering by hardware; only allow authorized roles
  if (role && role !== "hardware" && USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
    q = q.eq("role", role);
  } else {
    q = q.not("role", "in", '("customer","hardware")');
  }

  q = applyDateRange(q, searchParams);
  q = applySortingAndPagination(q, sortRules, pagination);

  const result = await q;
  if (result.error) {
    throw new ServiceError(result.error.message, 500);
  }

  return formatPaginatedResponse<User>(result.data as User[] | null, result.count, pagination);
}

/**
 * Creates a new user or customer account.
 */
export async function createUserAccount(data: CreateUserInput) {
  const { username, name, role, password } = data;
  const cleanUsername = username?.trim().toLowerCase() || null;
  const cleanPassword = password?.trim() || null;

  if (cleanUsername) {
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("username", cleanUsername)
      .is("deleted_at", null)
      .maybeSingle();

    if (checkError) {
      throw new ServiceError(checkError.message, 500);
    }

    if (existing) {
      throw new ServiceError(
        `Username "${cleanUsername}" is already taken by an active account.`,
        409,
      );
    }
  }

  const passwordHash = cleanPassword ? await argon2.hash(cleanPassword) : null;

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({
      username: cleanUsername,
      name: name.trim(),
      role,
      password_hash: passwordHash,
      factory_id: 1,
    })
    .select("id, username, name, role, factory_id, created_at, updated_at")
    .single();

  if (insertError) {
    throw new ServiceError(insertError.message, 500);
  }

  return created;
}

/**
 * Updates an existing user or customer account with integrity guards.
 */
export async function updateUserAccount(data: UpdateUserInput) {
  const { id, username, name, role, password } = data;

  const { data: existingUser, error: fetchErr } = await supabase
    .from("users")
    .select("id, username, role")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr) {
    throw new ServiceError(fetchErr.message, 500);
  }

  if (!existingUser) {
    throw new ServiceError("User not found or has been deleted.", 404);
  }

  const cleanUsername = username !== undefined ? username?.trim().toLowerCase() || null : undefined;

  if (
    cleanUsername !== undefined &&
    cleanUsername !== existingUser.username &&
    cleanUsername !== null
  ) {
    const { data: conflict, error: conflictErr } = await supabase
      .from("users")
      .select("id")
      .eq("username", cleanUsername)
      .neq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (conflictErr) {
      throw new ServiceError(conflictErr.message, 500);
    }

    if (conflict) {
      throw new ServiceError(
        `Username "${cleanUsername}" is already in use by another active account.`,
        409,
      );
    }
  }

  const updates: Record<string, unknown> = {
    name: name.trim(),
    updated_at: new Date().toISOString(),
  };

  if (cleanUsername !== undefined) {
    updates.username = cleanUsername;
  }

  if (role && role !== existingUser.role) {
    if (existingUser.role === "customer" && role !== "customer") {
      throw new ServiceError("Customer accounts cannot be converted to staff accounts.", 403);
    }
    if (existingUser.role !== "customer" && role === "customer") {
      throw new ServiceError("Staff accounts cannot be converted to customer accounts.", 403);
    }
    updates.role = role;
  }

  if (password && password.trim().length >= 6) {
    updates.password_hash = await argon2.hash(password.trim());
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select("id, username, name, role, factory_id, created_at, updated_at")
    .single();

  if (updateError) {
    throw new ServiceError(updateError.message, 500);
  }

  return updated;
}

/**
 * Soft-deletes user or customer accounts with batched relational pre-flight checks.
 */
export async function deleteUserAccounts(targetIds: number[]) {
  const { data: targetUsers, error: fetchErr } = await supabase
    .from("users")
    .select("id, username, role")
    .in("id", targetIds)
    .is("deleted_at", null);

  if (fetchErr) {
    throw new ServiceError(fetchErr.message, 500);
  }

  if (!targetUsers || targetUsers.length === 0) {
    throw new ServiceError("No active users found matching the specified ID(s).", 404);
  }

  const staffIds = targetUsers.filter((u) => u.role !== "customer").map((u) => u.id);
  const customerIds = targetUsers.filter((u) => u.role === "customer").map((u) => u.id);

  // Constant O(1) batched pre-flight queries
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

  const blockedUsers: { id: number; username: string | null; reasons: string[] }[] = [];

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
      .map((b) => `"${b.username || `ID ${b.id}`}" (ID: ${b.id}) has ${b.reasons.join(", ")}`)
      .join("; ");
    throw new ServiceError(
      `Cannot delete account(s): ${details}. Historical operational records must be preserved.`,
      409,
      blockedUsers,
    );
  }

  const now = new Date().toISOString();
  const { error: deleteErr } = await supabase
    .from("users")
    .update({ deleted_at: now, updated_at: now })
    .in("id", targetIds);

  if (deleteErr) {
    throw new ServiceError(deleteErr.message, 500);
  }

  return { deletedCount: targetIds.length };
}
