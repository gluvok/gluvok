/**
 * @file scripts/seed.ts
 * @description Master database seed script using Supabase JS client.
 * Seeds initial factory, admin user, hardware user, main center, and default commodities catalog.
 */

import { createClient } from "@supabase/supabase-js";
import { Role } from "../lib/constants/enums";
import { hashPassword } from "../lib/auth/password";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
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
      auto_approve: false,
      factory_id: factoryId,
    });
    console.log(`Created center '${centerName}' for factory id=${factoryId}`);
  }

  console.log("Hashing passwords for users...");
  const adminPasswordHash = await hashPassword("admin123");
  const hardwarePasswordHash = await hashPassword("hardware123");

  console.log("Inserting admin user ('admin1')...");
  const { data: existingAdmin } = await supabase
    .from("users")
    .select("id")
    .eq("username", "admin1")
    .maybeSingle();

  if (!existingAdmin) {
    const { data: newAdmin, error: adminErr } = await supabase
      .from("users")
      .insert({
        username: "admin1",
        password_hash: adminPasswordHash,
        name: "Admin User 1",
        role: Role.ADMIN,
        factory_id: factoryId,
      })
      .select("id")
      .single();
    if (adminErr || !newAdmin) throw adminErr || new Error("Failed to create admin user");
    console.log(`Admin user inserted with id=${newAdmin.id}`);
  } else {
    console.log("Admin user ('admin1') already exists.");
  }

  console.log("Inserting hardware device user ('pi1')...");
  const { data: existingHardware } = await supabase
    .from("users")
    .select("id")
    .eq("username", "pi1")
    .maybeSingle();

  if (!existingHardware) {
    const { data: newHardware, error: hwErr } = await supabase
      .from("users")
      .insert({
        username: "pi1",
        password_hash: hardwarePasswordHash,
        name: "Scale Hardware Unit 1",
        role: Role.HARDWARE,
        factory_id: factoryId,
      })
      .select("id")
      .single();
    if (hwErr || !newHardware) throw hwErr || new Error("Failed to create hardware user");
    console.log(`Hardware user inserted with id=${newHardware.id}`);
  } else {
    console.log("Hardware user ('pi1') already exists.");
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
