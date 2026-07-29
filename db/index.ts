import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn("DATABASE_URL is missing from environment variables.")
}

// Enforce SSL for Supabase PostgreSQL connection
const client = postgres(connectionString || "", {
  ssl: "require",
  prepare: false,
})

export const db = drizzle(client, { schema })
