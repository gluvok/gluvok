/**
 * @file db/index.ts
 * @description Database connection module exporting Supabase JS client.
 */

import { supabaseAdmin, supabase } from "@/lib/supabase"

export const db = supabaseAdmin
export { supabaseAdmin, supabase }
export function getDb() {
  return db
}
