/**
 * @file scripts/seed.ts
 * @description Master database seed script — seeds initial tenant admin user + linked profile and default commodities catalog.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... CENTER_NAME="Main Center" pnpm seed
 *   DATABASE_URL=postgresql://... FACTORY_NAME="Factory A" CENTER_NAME="Gate 1" pnpm seed --shared
 */

import { drizzle } from "drizzle-orm/postgres-js"
import { and, eq } from "drizzle-orm";
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

  const centerName = process.env.CENTER_NAME || "Main Center";
  console.log(`Ensuring center '${centerName}' exists...`);
  if (isShared) {
    if (sharedFactoryId == null) {
      throw new Error("Shared seed requires a factory ID");
    }
    const [existingCenter] = await db
      .select({ id: sharedSchema.centers.id })
      .from(sharedSchema.centers)
      .where(
        and(
          eq(sharedSchema.centers.name, centerName),
          eq(sharedSchema.centers.factory_id, sharedFactoryId),
        ),
      )
      .limit(1);

    if (!existingCenter) {
      await db.insert(sharedSchema.centers).values({
        name: centerName,
        factory_id: sharedFactoryId,
      });
      console.log(
        `Created center '${centerName}' for factory id=${sharedFactoryId}`,
      );
    }
  } else {
    const [existingCenter] = await db
      .select({ id: standaloneSchema.centers.id })
      .from(standaloneSchema.centers)
      .where(eq(standaloneSchema.centers.name, centerName))
      .limit(1);

    if (!existingCenter) {
      await db.insert(standaloneSchema.centers).values({ name: centerName });
      console.log(`Created center '${centerName}'`);
    }
  }

  console.log("Hashing password for admin user...")
  const passwordHash = await hashPassword("admin123")

  console.log("Inserting admin user ('admin')...")
  const userValues: Record<string, unknown> = {
    username: "admin",
    password_hash: passwordHash,
    role: Role.ADMIN,
    is_active: true,
    ...(isShared && sharedFactoryId ? { factory_id: sharedFactoryId } : {}),
  };

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
        name: "Admin User",
        role: Role.ADMIN,
      })
      .onConflictDoNothing();
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
