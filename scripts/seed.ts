/**
 * @file scripts/seed.ts
 * @description Master database seed script — seeds initial super admin user + linked profile and default commodities catalog.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm seed
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

const DEFAULT_COMMODITIES = [
  { name: "Wheat" },
  { name: "Scrap Copper" },
  { name: "Corn" },
  { name: "Crude Oil" },
  { name: "Barley" },
  { name: "Wine" },
  { name: "Cable" },
]

async function main() {
  console.log("Seeding database...")

  // 1. Seed Super Admin User & Linked Profile
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
    .onConflictDoNothing()
    .returning({ id: schema.users.id })

  if (superUser) {
    console.log(`Super admin user inserted with id=${superUser.id}`)
    console.log("Inserting linked profile for super admin...")
    await db
      .insert(schema.profiles)
      .values({
        userId: superUser.id,
        name: "Super Admin",
        role: Role.SUPER_ADMIN,
      })
      .onConflictDoNothing()
    console.log("Super admin profile seeded successfully!")
  } else {
    console.log("Super admin user already exists.")
  }

  // 2. Seed Default Commodities Catalog
  console.log("Seeding default commodities catalog...")
  for (const item of DEFAULT_COMMODITIES) {
    await db
      .insert(schema.commodities)
      .values(item)
      .onConflictDoNothing()
  }
  console.log("Commodities catalog seeded successfully!")

  console.log("Database seeding completed successfully!")
  await client.end()
}

main().catch((err) => {
  console.error("Database seeding failed:", err)
  process.exit(1)
})
