/**
 * @file scripts/seed.ts
 * @description Master database seed script — seeds initial tenant admin user + linked profile and default commodities catalog.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm seed                     # standalone (dedicated)
 *   DATABASE_URL=postgresql://... FACTORY_ID=1 pnpm seed --shared # shared (SaaS)
 */

import { drizzle } from "drizzle-orm/postgres-js"
import { eq } from "drizzle-orm"
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
  let sharedFactoryId: number | null = null

  if (isShared) {
    const factoryName =
      process.env.FACTORY_NAME ||
      (process.env.FACTORY_ID ? `Factory ${process.env.FACTORY_ID}` : "Default Factory")
    console.log(`Ensuring factory '${factoryName}' exists in Shared mode...`)

    const existingFactories = await db
      .select({ id: sharedSchema.factories.id })
      .from(sharedSchema.factories)
      .where(eq(sharedSchema.factories.name, factoryName))
      .limit(1)

    if (existingFactories.length > 0) {
      sharedFactoryId = existingFactories[0].id
      console.log(`Found existing factory '${factoryName}' with id=${sharedFactoryId}`)
    } else {
      const [created] = await db
        .insert(sharedSchema.factories)
        .values({ name: factoryName })
        .returning({ id: sharedSchema.factories.id })
      sharedFactoryId = created.id
      console.log(`Created new factory '${factoryName}' with id=${sharedFactoryId}`)
    }
  }

  const schemaLabel = isShared ? `shared (Factory ID: ${sharedFactoryId})` : "standalone"
  console.log(`Seeding database for ${schemaLabel}...`)

  console.log("Hashing password for admin user...")
  const passwordHash = await hashPassword("admin123")

  console.log("Inserting admin user ('admin')...")
  const userValues: Record<string, unknown> = {
    name: "Admin User",
    username: "admin",
    password_hash: passwordHash,
    role: Role.ADMIN,
    is_active: true,
    ...(isShared && sharedFactoryId ? { factory_id: sharedFactoryId } : {}),
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
        user_id: adminUser.id,
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
