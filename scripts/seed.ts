/**
 * @file scripts/seed.ts
 * @description Master database seed script using Supabase JS client.
 * Seeds initial factory, admin user, main center, and default commodities catalog.
 */

import { createClient } from "@supabase/supabase-js";
import { Role } from "../lib/constants/enums";
import { hashPassword } from "../lib/auth/password";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase URL and key environment variables are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_COMMODITIES = [
  { name: "Wheat" },
  { name: "Scrap Copper" },
  { name: "Corn" },
  { name: "Crude Oil" },
  { name: "Barley" },
  { name: "Wine" },
  { name: "Cable" },
];

async function main() {
  const factoryName = process.env.FACTORY_NAME || "Default Factory";
  console.log(`Ensuring factory '${factoryName}' exists...`);

  let factoryId: number;
  const { data: existingFactory } = await supabase
    .from("factories")
    .select("id")
    .eq("name", factoryName)
    .maybeSingle();

  if (existingFactory) {
    factoryId = existingFactory.id;
    console.log(`Found existing factory '${factoryName}' with id=${factoryId}`);
  } else {
    const { data: newFactory, error } = await supabase
      .from("factories")
      .insert({ name: factoryName })
      .select("id")
      .single();
    if (error || !newFactory) throw error || new Error("Failed to insert factory");
    factoryId = newFactory.id;
    console.log(`Created new factory '${factoryName}' with id=${factoryId}`);
  }

  const centerName = process.env.CENTER_NAME || "Main Center";
  console.log(`Ensuring center '${centerName}' exists...`);
  const { data: existingCenter } = await supabase
    .from("centers")
    .select("id")
    .eq("name", centerName)
    .eq("factory_id", factoryId)
    .maybeSingle();

  if (!existingCenter) {
    await supabase.from("centers").insert({
      name: centerName,
      factory_id: factoryId,
    });
    console.log(`Created center '${centerName}' for factory id=${factoryId}`);
  }

  console.log("Hashing password for admin user...");
  const passwordHash = await hashPassword("admin123");

  console.log("Inserting admin user ('admin')...");
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("username", "admin")
    .maybeSingle();

  let adminUserId: number;
  if (!existingUser) {
    const { data: newUser, error: userErr } = await supabase
      .from("users")
      .insert({
        username: "admin",
        password_hash: passwordHash,
        name: "Admin User",
        aadhar_number: null,
        role: Role.ADMIN,
        factory_id: factoryId,
      })
      .select("id")
      .single();
    if (userErr || !newUser) throw userErr || new Error("Failed to create admin user");
    adminUserId = newUser.id;
    console.log(`Admin user inserted with id=${adminUserId}`);
  } else {
    adminUserId = existingUser.id;
    console.log("Admin user already exists.");
  }

  console.log("Seeding default commodities catalog...");
  for (const item of DEFAULT_COMMODITIES) {
    const { data: existingComm } = await supabase
      .from("commodities")
      .select("id")
      .eq("name", item.name)
      .maybeSingle();

    if (!existingComm) {
      await supabase.from("commodities").insert({
        name: item.name,
      });
    }
  }
  console.log("Commodities catalog seeded successfully!");

  console.log("Database seeding completed successfully!");
}

main().catch((err) => {
  console.error("Database seeding failed:", err);
  process.exit(1);
});
