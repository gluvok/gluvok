/**
 * @file db/index.ts
 * @description Database connection module exporting Supabase JS client.
 */

import { supabase } from "@/lib/supabase"

export const db = supabase
export { supabase }
export function getDb() {
  return db
}
