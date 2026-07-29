/**
 * @file lib/supabase.ts
 * @description Initializes and configures the client-side Supabase SDK instance using environment credentials.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_TEST_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables in .env.local")
}

/**
 * supabase client instance
 * Shared client connection instance used for auth operations, real-time channels, and database transactions.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
