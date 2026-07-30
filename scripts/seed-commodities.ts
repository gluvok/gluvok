/**
 * @file scripts/seed-commodities.ts
 * @description Seeds default commodities catalog into database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/seed-commodities.ts
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../db/schema/standalone"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const client = postgres(connectionString, { ssl: "require", max: 1 })
const db = drizzle(client, { schema })

async function main() {
  console.log("Seeding default commodities catalog into database...")

  const defaultCommodities = [
    { name: "Wheat" },
    { name: "Scrap Copper" },
    { name: "Corn" },
    { name: "Crude Oil" },
    { name: "Barley" },
    { name: "Wine" },
    { name: "Cable" },
  ]

  for (const item of defaultCommodities) {
    await db
      .insert(schema.commodities)
      .values(item)
      .onConflictDoNothing()
  }

  console.log("Commodities catalog seeded successfully!")
  await client.end()
}

main().catch((err) => {
  console.error("Commodities seeding failed:", err)
  process.exit(1)
})
