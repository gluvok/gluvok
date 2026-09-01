/**
 * @file lib/services/weighments.ts
 * @description Service helpers for entry sequential approval validation and weighment pairing/merging.
 */

import { supabase } from "@/db";
import { EntryStatus, EntrySource, Unit, WeighmentType } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";

export async function validateSequentialApproval(
  client: typeof supabase,
  centerId: number,
  vehicleNumber: string,
  targetCreatedAt: string,
  targetEntryId: number,
  entrySource?: EntrySource,
): Promise<void> {
  let query = client
    .from("entries")
    .select("id, created_at, source")
    .eq("center_id", centerId)
    .eq("vehicle_number", vehicleNumber)
    .eq("status", EntryStatus.PENDING)
    .lt("created_at", targetCreatedAt)
    .neq("id", targetEntryId)
    .is("deleted_at", null);

  if (entrySource) {
    query = query.eq("source", entrySource);
  }

  const { data: earlierPending, error } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking earlier entries:", error);
    throw new Error(ApiErrorMessage.VALIDATE_SEQUENCE_FAILED);
  }

  if (earlierPending) {
    const sourceLabel = earlierPending.source ? `${earlierPending.source} ` : "";
    throw new Error(
      ApiErrorMessage.CANNOT_APPROVE_PENDING_EARLIER_ENTRY(
        targetEntryId,
        earlierPending.id,
        new Date(earlierPending.created_at).toLocaleString(),
        vehicleNumber,
        sourceLabel,
      ),
    );
  }
}

export async function tryMergeEntries(
  client: typeof supabase,
  factoryId: number,
  entryId: number,
): Promise<Record<string, unknown> | null> {
  // 1. Fetch current entry E2
  const { data: e2, error: fetchErr } = await client
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !e2 || e2.status !== EntryStatus.APPROVED) {
    return null;
  }

  // 2. Check if E2 is already linked in active weighments
  const { data: existingW2 } = await client
    .from("weighments")
    .select("id")
    .or(`in_entry_id.eq.${entryId},out_entry_id.eq.${entryId}`)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingW2) {
    return null;
  }

  // 3. Find latest preceding approved entry E1 for the same vehicle, factory, AND matching entry source
  let e1Query = client
    .from("entries")
    .select("*")
    .eq("factory_id", factoryId)
    .eq("vehicle_number", e2.vehicle_number)
    .eq("status", EntryStatus.APPROVED)
    .lt("created_at", e2.created_at)
    .neq("id", entryId)
    .is("deleted_at", null);

  if (e2.source) {
    e1Query = e1Query.eq("source", e2.source);
  }

  const { data: e1Candidates, error: e1Err } = await e1Query
    .order("created_at", { ascending: false })
    .limit(1);

  if (e1Err || !e1Candidates || e1Candidates.length === 0) {
    return null;
  }

  const e1 = e1Candidates[0];

  // 4. Check if E1 is already linked in active weighments
  const { data: existingW1 } = await client
    .from("weighments")
    .select("id")
    .or(`in_entry_id.eq.${e1.id},out_entry_id.eq.${e1.id}`)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingW1) {
    // E1 is already paired with another weighment, cannot pair with E2
    return null;
  }

  // 5. Create new weighment record linking E1 (In) and E2 (Out)
  const { data: newWeighment, error: insertErr } = await client
    .from("weighments")
    .insert({
      in_entry_id: e1.id,
      out_entry_id: e2.id,
      unit: Unit.KG,
    })
    .select("*")
    .single();

  if (insertErr) {
    console.error("Failed to create weighment record:", insertErr);
    return null;
  }

  return newWeighment;
}

export function formatWeighmentRecord(row: Record<string, unknown>): Record<string, unknown> {
  const inEntry = (row["in_entry"] as Record<string, unknown>) || {};
  const outEntry = (row["out_entry"] as Record<string, unknown>) || {};

  const inWeight = Number(inEntry.weight || 0);
  const outWeight = Number(outEntry.weight || 0);

  const grossWeight = Math.max(inWeight, outWeight);
  const tareWeight = Math.min(inWeight, outWeight);
  const netWeight = grossWeight - tareWeight;

  const inImages = Array.isArray(inEntry.images) ? (inEntry.images as string[]) : [];
  const outImages = Array.isArray(outEntry.images) ? (outEntry.images as string[]) : [];
  const combinedImages = Array.from(new Set([...inImages, ...outImages]));

  const inUsers = inEntry.users as Record<string, unknown> | undefined;
  const outUsers = outEntry.users as Record<string, unknown> | undefined;
  const inCustomers = inEntry.customers as Record<string, unknown> | undefined;
  const outCustomers = outEntry.customers as Record<string, unknown> | undefined;

  return {
    id: row.id,
    unit: row.unit || Unit.KG,
    type: row.type || WeighmentType.UNASSIGNED,
    gross_weight: grossWeight,
    tare_weight: tareWeight,
    net_weight: netWeight,
    images: combinedImages,
    in_entry_id: row.in_entry_id,
    in_entry_created_at: inEntry.created_at,
    out_entry_id: row.out_entry_id,
    out_entry_created_at: outEntry.created_at,
    center_id: inEntry.center_id,
    center_name: (inEntry.centers as { name: string }).name,
    in_user_id: inEntry.user_id,
    in_user_name: inUsers?.name || "",
    out_user_id: outEntry.user_id,
    out_user_name: outUsers?.name || "",
    in_customer_id: inEntry.customer_id,
    in_customer_name: inCustomers?.name || "",
    out_customer_id: outEntry.customer_id,
    out_customer_name: outCustomers?.name || "",
    vehicle_number: inEntry.vehicle_number || outEntry.vehicle_number || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
