/**
 * @file scripts/seed.ts
 * @description Master database seed script — seeds initial tenant admin user + linked profile and default commodities catalog.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm seed                     # standalone (dedicated)
 *   DATABASE_URL=postgresql://... FACTORY_ID=1 pnpm seed --shared # shared (SaaS)
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as standaloneSchema from "../db/schema/standalone"
import * as sharedSchema from "../db/schema/shared"
import { Role } from "../lib/constants/enums"
import { hashPassword } from "../lib/auth/password"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const isShared = process.env.SCHEMA === "shared" || process.argv.includes("--shared")
const factoryIdRaw = process.env.FACTORY_ID
if (isShared && (!factoryIdRaw || isNaN(Number(factoryIdRaw)) || Number(factoryIdRaw) <= 0)) {
  console.error("Error: FACTORY_ID environment variable is required when seeding in Shared mode (e.g. FACTORY_ID=1 pnpm seed --shared).")
  process.exit(1)
}
const factoryIdArg = factoryIdRaw ? Number(factoryIdRaw) : 0
const client = postgres(connectionString, { ssl: "require", max: 1 })
const schema = isShared ? sharedSchema : standaloneSchema
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
  const schemaLabel = isShared ? `shared (Factory ID: ${factoryIdArg})` : "standalone"
  console.log(`Seeding database for ${schemaLabel}...`)

  console.log("Hashing password for admin user...")
  const passwordHash = await hashPassword("admin123")

  console.log("Inserting admin user ('admin')...")
  const userValues: Record<string, unknown> = {
    name: "Admin User",
    username: "admin",
    passwordHash,
    role: Role.ADMIN,
    isActive: true,
    ...(isShared ? { factoryId: factoryIdArg } : {}),
  }

  const [adminUser] = await db
    .insert(schema.users)
    .values(userValues as typeof standaloneSchema.users.$inferInsert)
    .onConflictDoNothing()
    .returning({ id: schema.users.id })

  if (adminUser) {
    console.log(`Admin user inserted with id=${adminUser.id}`)
    console.log("Inserting linked profile for admin...")
    await db
      .insert(schema.profiles)
      .values({
        userId: adminUser.id,
        role: Role.ADMIN,
      })
      .onConflictDoNothing()
    console.log("Admin profile seeded successfully!")
  } else {
    console.log("Admin user already exists.")
  }

  // Seed Default Commodities Catalog
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
