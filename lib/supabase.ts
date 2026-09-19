/**
 * @file lib/supabase.ts
 * @description Initializes and configures the server-side Supabase SDK instance using environment credentials.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw Error("Supabase URL or Key is not defined");
}

/**
 * supabase client instance
 * Server-side client connection instance used for database and storage operations.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);