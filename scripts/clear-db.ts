/**
 * @file scripts/clear-db.ts
 * @description Forcefully clears/drops all database tables, indexes, and custom Postgres ENUM types CASCADE, then re-applies the Drizzle schema.
 *
 * Pass --shared flag (or set SCHEMA=shared) to push shared schema instead of standalone.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/clear-db.ts           # standalone (dedicated)
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/clear-db.ts --shared   # shared (SaaS)
 */

import postgres from "postgres"
import { execSync } from "child_process"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const isShared = process.env.SCHEMA === "shared" || process.argv.includes("--shared")
const drizzleConfig = isShared ? "drizzle.config.ts" : "drizzle.standalone.config.ts"
const schemaLabel = isShared ? "shared" : "standalone"

const client = postgres(connectionString, { ssl: "require", max: 1 })

async function main() {
  console.log(`Dropping all existing tables, types & schema CASCADE for a clean ${schemaLabel} setup...`)
  await client`DROP TYPE IF EXISTS user_role, field_requirement_mode, weighment_type, unit CASCADE`
  await client`DROP SCHEMA IF EXISTS public CASCADE`
  await client`CREATE SCHEMA public`
  await client`GRANT ALL ON SCHEMA public TO public`
  console.log("Database schema reset cleanly.")

  console.log(`Pushing ${schemaLabel} Drizzle schema to database...`)
  execSync(`pnpm drizzle-kit push --config=${drizzleConfig} --force`, {
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
