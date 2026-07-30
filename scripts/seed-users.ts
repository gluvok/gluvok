/**
 * @file scripts/seed-users.ts
 * @description Seeds initial super admin user into database by truncating existing users table and inserting 'super'.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/seed-users.ts
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../db/schema/standalone"
import { Role } from "../lib/constants/enums"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const client = postgres(connectionString, { ssl: "require", max: 1 })
const db = drizzle(client, { schema })

const FIXED_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$n4ztyxZUUav+lfVPUwJkTgU+AmLLtrEvClLpKXNnhyQ"

async function main() {
  console.log("Truncating users table...")
  await client`TRUNCATE TABLE users CASCADE`

  console.log("Inserting super admin user ('super')...")
  await db
    .insert(schema.users)
    .values({
      username: "super",
      passwordHash: FIXED_PASSWORD_HASH,
      role: Role.SUPER_ADMIN,
      isActive: true,
    })

  console.log("Super admin user seeded successfully!")
  await client.end()
}

main().catch((err) => {
  console.error("User seeding failed:", err)
  process.exit(1)
})
