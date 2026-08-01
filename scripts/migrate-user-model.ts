/**
 * Moves display names from users to profiles and removes the legacy hardware role.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm db:migrate:user-model
 */

import postgres from "postgres"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.")
  process.exit(1)
}

const sql = postgres(connectionString, { ssl: "require", max: 1 })

async function main() {
  await sql.begin(async (transaction) => {
    await transaction`UPDATE users SET role = 'operator' WHERE role = 'hardware'`
    await transaction`UPDATE profiles SET role = 'operator' WHERE role = 'hardware'`

    await transaction`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name varchar(255)
    `
    await transaction`
      UPDATE profiles
      SET name = COALESCE(NULLIF(users.name, ''), users.username)
      FROM users
      WHERE profiles.user_id = users.id AND profiles.name IS NULL
    `
    await transaction`
      ALTER TABLE profiles ALTER COLUMN name SET NOT NULL
    `
    await transaction`
      ALTER TABLE users DROP COLUMN IF EXISTS name
    `

    await transaction`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`
    await transaction`ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT`
    await transaction`
      CREATE TYPE role_enum_next AS ENUM ('admin', 'manager', 'operator', 'base')
    `
    await transaction`
      ALTER TABLE users
      ALTER COLUMN role TYPE role_enum_next USING role::text::role_enum_next
    `
    await transaction`
      ALTER TABLE profiles
      ALTER COLUMN role TYPE role_enum_next USING role::text::role_enum_next
    `
    await transaction`DROP TYPE role_enum`
    await transaction`ALTER TYPE role_enum_next RENAME TO role_enum`
    await transaction`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'base'::role_enum`
    await transaction`ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'base'::role_enum`
  })

  console.log("User model migration completed successfully.")
  await sql.end()
}

main().catch(async (error) => {
  console.error("User model migration failed:", error)
  await sql.end()
  process.exit(1)
})