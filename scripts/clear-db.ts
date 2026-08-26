/**
 * @file scripts/clear-db.ts
 * @description Clears/truncates data from all tables using Supabase JS client in proper dependency order.
 */

import { createClient } from "@supabase/supabase-js";
import { TableName } from "@/lib/constants/enums";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase URL and key environment variables are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Order: Dependent child tables first -> Independent/parent tables last
const tables = [
  TableName.WEIGHMENTS,
  TableName.ENTRIES,
  TableName.RATES,
  TableName.CUSTOMERS,
  TableName.COMMODITIES,
  TableName.CENTERS,
  TableName.USERS,
  TableName.FACTORIES,
];

async function main() {
  console.log("Clearing all data from Supabase tables...");
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", 0);
    if (error) {
      if (error.code === "PGRST205") {
        console.warn(
          `Could not clear table '${table}': Table does not exist in Supabase database schema (PGRST205). Please run 'schema.sql' in Supabase SQL Editor to create it.`,
        );
      } else {
        console.warn(`Could not clear table ${table}:`, error.message);
      }
    } else {
      console.log(`Cleared table: ${table}`);
    }

    const { error: seqError } = await supabase.rpc("reset_table_sequence", { table_name: table });
    if (!seqError) {
      console.log(`Reset sequence/index for table: ${table}`);
    }
  }

  const { error: resetAllErr } = await supabase.rpc("reset_all_sequences");
  if (!resetAllErr) {
    console.log("Reset all auto-increment sequence indexes successfully.");
  }

  console.log("Database cleared successfully!");
}

main().catch((err) => {
  console.error("Clear database failed:", err);
  process.exit(1);
});
