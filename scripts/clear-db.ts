/**
 * @file scripts/clear-db.ts
 * @description Forcefully clears/drops all database tables/schema CASCADE and re-applies the standalone Drizzle schema.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/clear-db.ts
 */

import postgres from "postgres"
import { execSync } from "child_process"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const client = postgres(connectionString, { ssl: "require", max: 1 })

async function main() {
  console.log("Dropping all existing tables & schema CASCADE for a clean setup...")
  await client`DROP SCHEMA IF EXISTS public CASCADE`
  await client`CREATE SCHEMA public`
  await client`GRANT ALL ON SCHEMA public TO public`
  console.log("Database schema reset cleanly.")

  console.log("Pushing standalone Drizzle schema to database...")
  execSync("pnpm drizzle-kit push --config=drizzle.standalone.config.ts --force", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connectionString },
  })

  console.log("Database cleared and schema pushed successfully!")
  await client.end()
}

main().catch((err) => {
  console.error("Clear database failed:", err)
  process.exit(1)
})
