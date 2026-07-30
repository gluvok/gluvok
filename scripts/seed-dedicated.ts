/**
 * @file scripts/seed-dedicated.ts
 * @description Seeds a fresh dedicated client database with the initial admin user.
 * Optional `--reset` flag or `RESET_DB=true` environment variable will drop all existing
 * tables and public schema first to ensure a clean slate when switching schemas.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm tsx scripts/seed-dedicated.ts [--reset]
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq } from "drizzle-orm"
import { execSync } from "child_process"
import * as schema from "../db/schema/standalone"
import { Role } from "../lib/constants/enums"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required.")
  process.exit(1)
}

const client = postgres(connectionString, { ssl: "require", max: 1 })
const db = drizzle(client, { schema })

const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001"
const FIXED_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$n4ztyxZUUav+lfVPUwJkTgU+AmLLtrEvClLpKXNnhyQ"

async function main() {
  const shouldReset = process.env.RESET_DB === "true" || process.argv.includes("--reset")

  if (shouldReset) {
    console.log("Dropping all existing tables & schema CASCADE for a clean dedicated DB...")
    await client`DROP SCHEMA IF EXISTS public CASCADE`
    await client`CREATE SCHEMA public`
    await client`GRANT ALL ON SCHEMA public TO public`
    console.log("Database schema reset cleanly.")

    console.log("Pushing standalone Drizzle schema to database...")
    execSync("pnpm drizzle-kit push --config=drizzle.standalone.config.ts --force", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: connectionString },
    })
  }

  console.log("Seeding dedicated database...")

  // Upsert Admin User
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, ADMIN_USER_ID))
    .limit(1)

  if (existingUser) {
    console.log(`Admin user '${existingUser.username}' already exists. Updating password, role & status...`)
    await db
      .update(schema.users)
      .set({
        username: "admin",
        passwordHash: FIXED_PASSWORD_HASH,
        role: Role.ADMIN,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, ADMIN_USER_ID))
  } else {
    console.log("Inserting admin user ('admin')...")
    await db
      .insert(schema.users)
      .values({
        id: ADMIN_USER_ID,
        username: "admin",
        passwordHash: FIXED_PASSWORD_HASH,
        role: Role.ADMIN,
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
