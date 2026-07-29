/**
 * @file lib/supabase.ts
 * @description Initializes and configures the client-side Supabase SDK instance using environment credentials.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_TEST_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder.supabase.co"

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_TEST_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-key"

/**
 * supabase client instance
 * Shared client connection instance used for auth operations, real-time channels, and database transactions.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
