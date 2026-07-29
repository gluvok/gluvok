/**
 * @file scripts/seed-superadmin.ts
 * @description TypeScript script to seed super_admin user into the database.
 */

import { createClient } from "@supabase/supabase-js"
import { argon2id } from "hash-wasm"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_TEST_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ivatsbrhsdwkrkiecrvg.supabase.co"

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_TEST_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_TEST_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedSuperAdmin() {
  console.log("Seeding Super Admin user...")

  // 1. Get or create a factory ID
  let factoryId = 1
  const { data: existingFactories } = await supabase
    .from("factories")
    .select("id, name")
    .limit(1)

  if (existingFactories && existingFactories.length > 0) {
    factoryId = existingFactories[0].id
  } else {
    const { data: newFactory, error: factoryError } = await supabase
      .from("factories")
      .upsert({ id: 1, name: "Main Factory" }, { onConflict: "id" })
      .select()
      .single()

    if (factoryError) {
      console.warn("Notice when creating factory:", factoryError.message)
    } else if (newFactory) {
      factoryId = newFactory.id
    }
  }

  // 2. Hash password123 with Argon2id using fixed salt
  const FIXED_SALT = new Uint8Array(16)
  const passwordHash = await argon2id({
    password: "password123",
    salt: FIXED_SALT,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  })

  // 3. Upsert user in public.users table
  const superUserId = "00000000-0000-0000-0000-000000000001"
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        id: superUserId,
        username: "super",
        password_hash: passwordHash,
        role: "super_admin",
        factory_id: factoryId,
        is_active: true,
      },
      { onConflict: "username" }
    )
    .select()
    .single()

  if (userError) {
    console.error("Failed to seed user:", userError.message)
    process.exit(1)
  }

  // 4. Upsert profile in public.profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        aadhar_number: "999999999999",
        name: "Super Admin",
        role: "super_admin",
      },
      { onConflict: "user_id" }
    )

  if (profileError) {
    console.error("Failed to seed profile:", profileError.message)
    process.exit(1)
  }

  console.log("✅ Super Admin successfully created/updated!")
  console.log("------------------------------------------")
  console.log("Username: super")
  console.log("Password: password123")
  console.log("Role:     super_admin")
  console.log("Factory ID:", factoryId)
  console.log("------------------------------------------")
}

seedSuperAdmin().catch((err) => {
  console.error("Unexpected error during seeding:", err)
  process.exit(1)
})
