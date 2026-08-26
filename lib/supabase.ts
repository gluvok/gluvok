/**
 * @file lib/supabase.ts
 * @description Initializes and configures the Supabase SDK instance using environment credentials.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

/**
 * supabase client instance
 * Shared client connection instance used for real-time channels, storage, and database operations.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
