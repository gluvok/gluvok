import postgres from "postgres"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.")
  process.exit(1)
}

const sql = postgres(connectionString, { ssl: "require", max: 1 })

async function main() {
  await sql.begin(async (transaction) => {
    await transaction`ALTER TABLE weighments ALTER COLUMN rate_id DROP NOT NULL`
    await transaction`ALTER TABLE weighments ALTER COLUMN customer_id DROP NOT NULL`
  })

  console.log("Weighment optional relation migration completed successfully.")
  await sql.end()
}

main().catch(async (error) => {
  console.error("Weighment optional relation migration failed:", error)
  await sql.end()
  process.exit(1)
})