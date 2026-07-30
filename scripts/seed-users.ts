/**
 * @file scripts/seed-users.ts
 * @description Seeds initial super admin user + linked profile into database.
 * Truncates existing users and profiles before inserting fresh records.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/seed-users.ts
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../db/schema/standalone"
import { Role } from "../lib/constants/enums"
import { hashPassword } from "../lib/auth/password"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const client = postgres(connectionString, { ssl: "require", max: 1 })
const db = drizzle(client, { schema })

async function main() {
  console.log("Truncating profiles & users tables...")
  // profiles first (FK dependency on users)
  await client`TRUNCATE TABLE profiles CASCADE`
  await client`TRUNCATE TABLE users CASCADE`

  console.log("Hashing password for super admin user...")
  const passwordHash = await hashPassword("super123")

  console.log("Inserting super admin user ('super')...")
  const [superUser] = await db
    .insert(schema.users)
    .values({
      username: "super",
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    })
    .returning({ id: schema.users.id })

  console.log(`Super admin user inserted with id=${superUser.id}`)

  console.log("Inserting linked profile for super admin...")
  await db
    .insert(schema.profiles)
    .values({
      userId: superUser.id,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    })

  console.log("Super admin profile seeded successfully!")
  await client.end()
}

main().catch((err) => {
  console.error("User seeding failed:", err)
  process.exit(1)
})
