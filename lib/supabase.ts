/**
 * @file lib/supabase.ts
 * @description Initializes and configures the Supabase SDK instance using environment credentials.
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

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-key"

/**
 * supabase client instance
 * Shared client connection instance used for real-time channels, storage, and database operations.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * supabaseAdmin client instance
 * Privileged client connection instance for backend API routes and administrative tasks.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
