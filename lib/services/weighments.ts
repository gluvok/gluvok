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
    .select("id, status, vehicle_number, created_at, source, center_id")
    .eq("id", entryId)
    .eq("factory_id", factoryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !e2 || e2.status !== EntryStatus.APPROVED) {
    return null;
  }

  // 2. Fetch factory configuration to check if center scoping is enabled
  const { data: factory } = await client
    .from("factories")
    .select("check_center_on_merge")
    .eq("id", factoryId)
    .is("deleted_at", null)
    .maybeSingle();

  // 3. Check if E2 is already linked in weighments AND query E1 candidates in parallel
  let e1Query = client
    .from("entries")
    .select("id, vehicle_number, weight, created_at, source, center_id")
    .eq("factory_id", factoryId)
    .eq("vehicle_number", e2.vehicle_number)
    .eq("status", EntryStatus.APPROVED)
    .lt("created_at", e2.created_at)
    .neq("id", entryId)
    .is("deleted_at", null);

  if (e2.source) {
    e1Query = e1Query.eq("source", e2.source);
  }

  if (factory?.check_center_on_merge) {
    e1Query = e1Query.eq("center_id", e2.center_id);
  }

  const [w2Check, e1Res] = await Promise.all([
    client
      .from("weighments")
      .select("id")
      .or(`in_entry_id.eq.${entryId},out_entry_id.eq.${entryId}`)
      .is("deleted_at", null)
      .maybeSingle(),
    e1Query.order("created_at", { ascending: false }).limit(1),
  ]);

  if (w2Check.data) {
    return null;
  }

  // 4. Try backward merge: look for an earlier unmerged entry (E1 In, E2 Out)
  if (!e1Res.error && e1Res.data && e1Res.data.length > 0) {
    const e1 = e1Res.data[0];

    const { data: existingW1 } = await client
      .from("weighments")
      .select("id")
      .or(`in_entry_id.eq.${e1.id},out_entry_id.eq.${e1.id}`)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existingW1) {
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
  }

  // 5. Try forward merge: look for a later unmerged entry (E2 In, E_next Out)
  let eNextQuery = client
    .from("entries")
    .select("id, vehicle_number, weight, created_at, source, center_id")
    .eq("factory_id", factoryId)
    .eq("vehicle_number", e2.vehicle_number)
    .eq("status", EntryStatus.APPROVED)
    .gt("created_at", e2.created_at)
    .neq("id", entryId)
    .is("deleted_at", null);

  if (e2.source) {
    eNextQuery = eNextQuery.eq("source", e2.source);
  }

  if (factory?.check_center_on_merge) {
    eNextQuery = eNextQuery.eq("center_id", e2.center_id);
  }

  const { data: eNextCandidates, error: eNextErr } = await eNextQuery
    .order("created_at", { ascending: true })
    .limit(1);

  if (!eNextErr && eNextCandidates && eNextCandidates.length > 0) {
    const eNext = eNextCandidates[0];

    const { data: existingWNext } = await client
      .from("weighments")
      .select("id")
      .or(`in_entry_id.eq.${eNext.id},out_entry_id.eq.${eNext.id}`)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existingWNext) {
      const { data: newWeighment, error: insertErr } = await client
        .from("weighments")
        .insert({
          in_entry_id: e2.id,
          out_entry_id: eNext.id,
          unit: Unit.KG,
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Failed to create forward weighment record:", insertErr);
        return null;
      }

      return newWeighment;
    }
  }

  return null;
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
    rate_id: (row.rate_id as number | undefined) ?? null,
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

export async function deleteWeighments(
  client: typeof supabase,
  factoryId: number,
  weighmentIds: number[],
): Promise<{ deletedIds: number[]; cascadedEntryIds: number[] }> {
  if (!weighmentIds || weighmentIds.length === 0) {
    return { deletedIds: [], cascadedEntryIds: [] };
  }

  // 1. Fetch weighments with factory verification
  const { data: weighments, error: fetchErr } = await client
    .from("weighments")
    .select(`id, in_entry_id, out_entry_id, in_entry:entries!in_entry_id(factory_id)`)
    .in("id", weighmentIds)
    .is("deleted_at", null);

  if (fetchErr) {
    console.error("Failed to fetch weighments for deletion:", fetchErr);
    throw new Error("Failed to delete weighments");
  }

  const validWeighments = (weighments || []).filter(
    (w: Record<string, unknown>) =>
      (w["in_entry"] as { factory_id?: number } | undefined)?.factory_id === factoryId,
  );

  if (validWeighments.length === 0) {
    return { deletedIds: [], cascadedEntryIds: [] };
  }

  const now = new Date().toISOString();
  const validIds = validWeighments.map((w) => w.id as number);

  // 2. Soft delete the weighment record(s)
  const { error: deleteErr } = await client
    .from("weighments")
    .update({
      deleted_at: now,
      updated_at: now,
    })
    .in("id", validIds)
    .is("deleted_at", null);

  if (deleteErr) {
    console.error("Failed to soft delete weighments:", deleteErr);
    throw new Error("Failed to delete weighments");
  }

  // 3. Cascade soft delete to corresponding in_entry and out_entry
  const cascadedEntryIds = [
    ...new Set(
      validWeighments
        .flatMap((w) => [w.in_entry_id as number, w.out_entry_id as number])
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  ];

  if (cascadedEntryIds.length > 0) {
    const { error: cascadeErr } = await client
      .from("entries")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .in("id", cascadedEntryIds)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    if (cascadeErr) {
      console.error("Failed to cascade soft delete to linked entries:", cascadeErr);
    }
  }

  return { deletedIds: validIds, cascadedEntryIds };
}
