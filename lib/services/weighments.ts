/**
 * @file lib/services/weighments.ts
 * @description Service helpers for entry sequential approval validation and weighment pairing/merging.
 */

import { supabase } from "@/db"
import { TableName, EntryStatus, EntryType, EntityKey, Unit } from "@/lib/constants/enums"

export async function validateSequentialApproval(
  client: typeof supabase,
  factoryId: number,
  vehicleNumber: string,
  targetCreatedAt: string,
  targetEntryId: number,
  entryType?: EntryType
): Promise<void> {
  let query = client
    .from(TableName.ENTRIES)
    .select(`${EntityKey.ID}, ${EntityKey.CREATED_AT}, ${EntityKey.TYPE}`)
    .eq(EntityKey.FACTORY_ID, factoryId)
    .eq(EntityKey.VEHICLE_NUMBER, vehicleNumber)
    .eq(EntityKey.STATUS, EntryStatus.PENDING)
    .lt(EntityKey.CREATED_AT, targetCreatedAt)
    .neq(EntityKey.ID, targetEntryId)

  if (entryType) {
    query = query.eq(EntityKey.TYPE, entryType)
  }

  const { data: earlierPending, error } = await query
    .order(EntityKey.CREATED_AT, { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error checking earlier entries:", error)
    throw new Error("Failed to validate entry sequence.")
  }

  if (earlierPending) {
    const typeLabel = earlierPending.type ? `${earlierPending.type} ` : ""
    throw new Error(
      `Cannot approve entry #${targetEntryId} because earlier ${typeLabel}entry #${earlierPending.id} (from ${new Date(
        earlierPending.created_at
      ).toLocaleString()}) for vehicle "${vehicleNumber}" is still pending. Please approve entries in sequential order.`
    )
  }
}

export async function tryMergeEntries(
  client: typeof supabase,
  factoryId: number,
  entryId: number
): Promise<Record<string, unknown> | null> {
  // 1. Fetch current entry E2
  const { data: e2, error: fetchErr } = await client
    .from(TableName.ENTRIES)
    .select("*")
    .eq(EntityKey.ID, entryId)
    .eq(EntityKey.FACTORY_ID, factoryId)
    .maybeSingle()

  if (fetchErr || !e2 || e2.status !== EntryStatus.APPROVED) {
    return null
  }

  // 2. Check if E2 is already linked in weighments
  const { data: existingW2 } = await client
    .from(TableName.WEIGHMENTS)
    .select(EntityKey.ID)
    .or(`${EntityKey.IN_ENTRY_ID}.eq.${entryId},${EntityKey.OUT_ENTRY_ID}.eq.${entryId}`)
    .maybeSingle()

  if (existingW2) {
    return null
  }

  // 3. Find latest preceding approved entry E1 for the same vehicle, factory, AND matching entry type
  let e1Query = client
    .from(TableName.ENTRIES)
    .select("*")
    .eq(EntityKey.FACTORY_ID, factoryId)
    .eq(EntityKey.VEHICLE_NUMBER, e2.vehicle_number)
    .eq(EntityKey.STATUS, EntryStatus.APPROVED)
    .lt(EntityKey.CREATED_AT, e2.created_at)
    .neq(EntityKey.ID, entryId)

  if (e2.type) {
    e1Query = e1Query.eq(EntityKey.TYPE, e2.type)
  }

  const { data: e1Candidates, error: e1Err } = await e1Query
    .order(EntityKey.CREATED_AT, { ascending: false })
    .limit(1)

  if (e1Err || !e1Candidates || e1Candidates.length === 0) {
    return null
  }

  const e1 = e1Candidates[0]

  // 4. Check if E1 is already linked in weighments
  const { data: existingW1 } = await client
    .from(TableName.WEIGHMENTS)
    .select(EntityKey.ID)
    .or(`${EntityKey.IN_ENTRY_ID}.eq.${e1.id},${EntityKey.OUT_ENTRY_ID}.eq.${e1.id}`)
    .maybeSingle()

  if (existingW1) {
    // E1 is already paired with another weighment, cannot pair with E2
    return null
  }

  // 5. Create new weighment record linking E1 (In) and E2 (Out)
  const { data: newWeighment, error: insertErr } = await client
    .from(TableName.WEIGHMENTS)
    .insert({
      [EntityKey.IN_ENTRY_ID]: e1.id,
      [EntityKey.OUT_ENTRY_ID]: e2.id,
      [EntityKey.UNIT]: Unit.KG,
    })
    .select("*")
    .single()

  if (insertErr) {
    console.error("Failed to create weighment record:", insertErr)
    return null
  }

  return newWeighment
}
