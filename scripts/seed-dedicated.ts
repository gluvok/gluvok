/**
 * @file scripts/seed-dedicated.ts
 * @description Seeds a fresh dedicated client database with the super_admin user only.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/seed-dedicated.ts
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq } from "drizzle-orm"
import * as schema from "../db/schema/standalone"
import { Role } from "../lib/constants/enums"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const client = postgres(connectionString, { ssl: "require", max: 1 })
const db = drizzle(client, { schema })

const SUPER_ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001"
const FIXED_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$n4ztyxZUUav+lfVPUwJkTgU+AmLLtrEvClLpKXNnhyQ"

async function main() {
  console.log("Seeding dedicated database...")

  // Upsert Super Admin User
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, SUPER_ADMIN_USER_ID))
    .limit(1)

  if (existingUser) {
    console.log(`Super admin user '${existingUser.username}' already exists. Updating password & status...`)
    await db
      .update(schema.users)
      .set({
        passwordHash: FIXED_PASSWORD_HASH,
        role: Role.SUPER_ADMIN,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, SUPER_ADMIN_USER_ID))
  } else {
    console.log("Inserting super admin user ('super')...")
    await db
      .insert(schema.users)
      .values({
        id: SUPER_ADMIN_USER_ID,
        username: "super",
        passwordHash: FIXED_PASSWORD_HASH,
        role: Role.SUPER_ADMIN,
        isActive: true,
      })
  }

  console.log("Seeding completed successfully!")
  await client.end()
}

main().catch((err) => {
  console.error("Seeding failed:", err)
  process.exit(1)
})
