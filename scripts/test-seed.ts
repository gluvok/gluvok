/**
 * @file scripts/test-seed.ts
 * @description Simplified database seed script for development and testing.
 * Seeds representative test datasets across factories, users (all 5 roles),
 * centers, commodities, customers, entries, weighments, and support tickets
 * matching schema.sql.
 */

import argon2 from "argon2";
import { supabase } from "./supabase.ts";

type Role = "admin" | "manager" | "operator" | "base" | "hardware";
type EntryStatus = "pending" | "approved" | "rejected";
type Unit = "kg" | "q" | "gal";
type WeighmentType = "unassigned" | "in" | "out";
type TicketStatus = "pending" | "approved" | "rejected";

const TABLES_IN_CLEAR_ORDER = [
  "tickets",
  "weighments",
  "entries",
  "sessions",
  "customers",
  "commodities",
  "centers",
  "users",
  "factories",
];

async function clearDatabase() {
  console.log("🧹 [Clean Mode] Clearing all existing records from database...");

  for (const table of TABLES_IN_CLEAR_ORDER) {
    const { error } = await supabase.from(table).delete().neq("id", 0);
    if (error) {
      if (error.code === "PGRST205") {
        console.warn(`  ⚠️ Table '${table}' does not exist in schema.`);
      } else {
        console.warn(`  ⚠️ Could not clear table '${table}':`, error.message);
      }
    } else {
      console.log(`  ✓ Cleared table: ${table}`);
    }

    try {
      await supabase.rpc("reset_table_sequence", { table_name: table });
    } catch {
      // Ignore if rpc does not exist
    }
  }

  try {
    await supabase.rpc("reset_all_sequences");
    console.log("  ✓ Reset all auto-increment sequences.");
  } catch {
    // Ignore if rpc is not present
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClean =
    args.includes("--clean") || args.includes("--reset") || process.env.RESET === "true";

  console.log("=================================================");
  console.log("🚀 Starting Database Seeding");
  console.log(`📡 Supabase Endpoint: ${process.env.SUPABASE_URL}`);
  console.log(`🧹 Clean Mode: ${shouldClean ? "ENABLED" : "DISABLED"}`);
  console.log("=================================================");

  if (shouldClean) {
    await clearDatabase();
  }

  // 1. FACTORIES
  console.log("\n🏭 [1/8] Seeding Factories...");
  const factoryConfigs = [{ name: "Default Factory" }, { name: "Apex Agro Logistics" }];
  const factoryMap = new Map<string, number>();

  for (const f of factoryConfigs) {
    const { data: existing } = await supabase
      .from("factories")
      .select("id")
      .eq("name", f.name)
      .maybeSingle();

    if (existing) {
      factoryMap.set(f.name, existing.id);
      console.log(`  ✓ Found existing factory: '${f.name}' (id: ${existing.id})`);
    } else {
      const { data: created, error } = await supabase
        .from("factories")
        .insert({ name: f.name })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to insert factory ${f.name}`);
      factoryMap.set(f.name, created.id);
      console.log(`  + Created factory: '${f.name}' (id: ${created.id})`);
    }
  }

  const primaryFactoryId = factoryMap.get("Default Factory")!;
  const secondaryFactoryId = factoryMap.get("Apex Agro Logistics")!;

  // 2. USERS (Admin, Manager, Operator, Base, Hardware)
  console.log("\n👥 [2/8] Seeding Users across all personnel roles...");
  console.log("  🔒 Hashing passwords with Argon2id...");
  const [adminHash, managerHash, operatorHash, userHash, hardwareHash] = await Promise.all([
    argon2.hash("admin123"),
    argon2.hash("manager123"),
    argon2.hash("operator123"),
    argon2.hash("user123"),
    argon2.hash("hardware123"),
  ]);

  const userConfigs: Array<{
    username: string;
    name: string;
    role: Role;
    passwordHash: string;
    factoryId: number;
  }> = [
    {
      username: "admin1",
      name: "Admin Factory 1",
      role: "admin",
      passwordHash: adminHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "manager1",
      name: "Manager Factory 1",
      role: "manager",
      passwordHash: managerHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "operator1",
      name: "Operator Factory 1",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "customer1",
      name: "Customer Factory 1",
      role: "base",
      passwordHash: userHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "pi1",
      name: "Hardware Scale Factory 1",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "admin2",
      name: "Admin Factory 2",
      role: "admin",
      passwordHash: adminHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "operator2",
      name: "Operator Factory 2",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "pi2",
      name: "Hardware Scale Factory 2",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: secondaryFactoryId,
    },
  ];

  const userMap = new Map<string, number>();

  for (const u of userConfigs) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", u.username)
      .maybeSingle();

    if (existing) {
      userMap.set(u.username, existing.id);
      console.log(`  ✓ Found user: '${u.username}' (${u.role}, id: ${existing.id})`);
    } else {
      const { data: created, error } = await supabase
        .from("users")
        .insert({
          username: u.username,
          name: u.name,
          role: u.role,
          password_hash: u.passwordHash,
          factory_id: u.factoryId,
        })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create user ${u.username}`);
      userMap.set(u.username, created.id);
      console.log(`  + Created user: '${u.username}' (${u.role}, id: ${created.id})`);
    }
  }

  // 3. CENTERS
  console.log("\n🏢 [3/8] Seeding Centers...");
  const centerConfigs = [
    { name: "Main Weighbridge", autoApprove: false, factoryId: primaryFactoryId },
    { name: "North Automatic Scale", autoApprove: true, factoryId: primaryFactoryId },
    { name: "Apex Terminal 1", autoApprove: false, factoryId: secondaryFactoryId },
  ];

  const centerMap = new Map<string, number>();

  for (const c of centerConfigs) {
    const { data: existing } = await supabase
      .from("centers")
      .select("id")
      .eq("name", c.name)
      .eq("factory_id", c.factoryId)
      .maybeSingle();

    if (existing) {
      centerMap.set(c.name, existing.id);
      console.log(`  ✓ Found center: '${c.name}' (id: ${existing.id})`);
    } else {
      const { data: created, error } = await supabase
        .from("centers")
        .insert({
          name: c.name,
          auto_approve: c.autoApprove,
          factory_id: c.factoryId,
        })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create center ${c.name}`);
      centerMap.set(c.name, created.id);
      console.log(`  + Created center: '${c.name}' (id: ${created.id})`);
    }
  }

  // 4. COMMODITIES
  console.log("\n🌾 [4/8] Seeding Commodities...");
  const commodityNames = ["Wheat", "Corn", "Soybeans", "Sugarcane", "Cotton"];
  const commodityMap = new Map<string, number>();

  for (const name of commodityNames) {
    const { data: existing } = await supabase
      .from("commodities")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      commodityMap.set(name, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("commodities")
        .insert({ name })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create commodity ${name}`);
      commodityMap.set(name, created.id);
    }
  }
  console.log(`  ✓ Seeded ${commodityMap.size} commodities.`);

  // 5. CUSTOMERS
  console.log("\n🧑‍🌾 [5/8] Seeding Customers...");
  const customerConfigs = [
    {
      name: "Ramesh Kumar",
      fatherName: "Suresh Kumar",
      username: "customer1",
      factoryId: primaryFactoryId,
    },
    {
      name: "Anita Sharma",
      fatherName: "Vijay Sharma",
      username: null,
      factoryId: primaryFactoryId,
    },
    {
      name: "Apex Agritech Co.",
      fatherName: "Commercial Account",
      username: null,
      factoryId: secondaryFactoryId,
    },
  ];

  const customerMap = new Map<string, number>();

  for (const cust of customerConfigs) {
    const userId = cust.username ? (userMap.get(cust.username) ?? null) : null;
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("name", cust.name)
      .eq("factory_id", cust.factoryId)
      .maybeSingle();

    if (existing) {
      customerMap.set(cust.name, existing.id);
      console.log(`  ✓ Found customer: '${cust.name}' (id: ${existing.id})`);
    } else {
      const { data: created, error } = await supabase
        .from("customers")
        .insert({
          name: cust.name,
          father_name: cust.fatherName,
          user_id: userId,
          factory_id: cust.factoryId,
        })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create customer ${cust.name}`);
      customerMap.set(cust.name, created.id);
      console.log(`  + Created customer: '${cust.name}' (id: ${created.id})`);
    }
  }

  // 6. ENTRIES & WEIGHMENTS
  console.log("\n🚛 [6/8] Seeding Paired Entries and Weighments...");
  const mainCenterId = centerMap.get("Main Weighbridge")!;
  const northCenterId = centerMap.get("North Automatic Scale")!;
  const operator1Id = userMap.get("operator1")!;
  const manager1Id = userMap.get("manager1")!;
  const pi1Id = userMap.get("pi1")!;
  const rameshCustomerId = customerMap.get("Ramesh Kumar")!;
  const anitaCustomerId = customerMap.get("Anita Sharma")!;

  // Inbound entry for paired weighment
  const { data: inEntry, error: inErr } = await supabase
    .from("entries")
    .insert({
      vehicle_number: "MH12AB1234",
      detected_vehicle_number: "MH12AB1234",
      weight: 32500.0,
      status: "approved" as EntryStatus,
      auto_approved: false,
      center_id: mainCenterId,
      customer_id: rameshCustomerId,
      factory_id: primaryFactoryId,
      created_by: operator1Id,
      approved_by: operator1Id,
      images: [],
    })
    .select("id")
    .single();

  if (inErr || !inEntry) {
    throw inErr || new Error("Failed to insert inEntry");
  }

  // Outbound entry for paired weighment
  const { data: outEntry, error: outErr } = await supabase
    .from("entries")
    .insert({
      vehicle_number: "MH12AB1234",
      detected_vehicle_number: "MH12AB1234",
      weight: 14200.0,
      status: "approved" as EntryStatus,
      auto_approved: false,
      center_id: mainCenterId,
      customer_id: rameshCustomerId,
      factory_id: primaryFactoryId,
      created_by: operator1Id,
      approved_by: operator1Id,
      images: [],
    })
    .select("id")
    .single();

  if (outErr || !outEntry) {
    throw outErr || new Error("Failed to insert outEntry");
  }

  // Linked double-entry weighment
  const { data: weighment, error: weighmentErr } = await supabase
    .from("weighments")
    .insert({
      in_entry_id: inEntry.id,
      out_entry_id: outEntry.id,
      unit: "kg" as Unit,
      type: "in" as WeighmentType,
    })
    .select("id")
    .single();

  if (weighmentErr || !weighment) {
    throw weighmentErr || new Error("Failed to insert weighment");
  }

  console.log(
    `  ✓ Created weighment (id: ${weighment.id}) linking in-entry (${inEntry.id}) and out-entry (${outEntry.id})`,
  );

  // 7. STANDALONE UNPAIRED ENTRIES
  console.log("\n📋 [7/8] Seeding Standalone Entries (Pending, Auto-Approved, Rejected)...");
  interface StandaloneEntryData {
    vehicle_number: string;
    detected_vehicle_number: string;
    weight: number;
    status: EntryStatus;
    auto_approved: boolean;
    center_id: number;
    customer_id: number | null;
    factory_id: number;
    created_by: number;
    approved_by: number | null;
    images: string[];
  }

  const standaloneEntriesData: StandaloneEntryData[] = [
    {
      vehicle_number: "DL01XY9876",
      detected_vehicle_number: "DL01XY9876",
      weight: 28400.0,
      status: "pending",
      auto_approved: false,
      center_id: mainCenterId,
      customer_id: anitaCustomerId,
      factory_id: primaryFactoryId,
      created_by: operator1Id,
      approved_by: null,
      images: [],
    },
    {
      vehicle_number: "KA04CD5678",
      detected_vehicle_number: "KA04CD5678",
      weight: 18900.0,
      status: "approved",
      auto_approved: true,
      center_id: northCenterId,
      customer_id: null,
      factory_id: primaryFactoryId,
      created_by: pi1Id,
      approved_by: pi1Id,
      images: [],
    },
    {
      vehicle_number: "GJ03EF4321",
      detected_vehicle_number: "GJ03EF4321",
      weight: 15000.0,
      status: "rejected",
      auto_approved: false,
      center_id: mainCenterId,
      customer_id: null,
      factory_id: primaryFactoryId,
      created_by: operator1Id,
      approved_by: operator1Id,
      images: [],
    },
  ];

  const createdStandaloneEntries: number[] = [];
  for (const entryData of standaloneEntriesData) {
    const { data: created, error } = await supabase
      .from("entries")
      .insert(entryData)
      .select("id")
      .single();

    if (error || !created) {
      console.warn(
        `  ⚠️ Failed to insert standalone entry ${entryData.vehicle_number}:`,
        error?.message,
      );
    } else {
      createdStandaloneEntries.push(created.id);
      console.log(
        `  + Created standalone entry: ${entryData.vehicle_number} [${entryData.status}] (id: ${created.id})`,
      );
    }
  }

  // 8. TICKETS
  console.log("\n🎫 [8/8] Seeding Support Tickets (Constraint Validated)...");
  const pendingEntryId = createdStandaloneEntries[0] ?? inEntry.id;

  interface TicketData {
    concern: string;
    reply: string | null;
    status: TicketStatus;
    entry_id: number | null;
    weighment_id: number | null;
    user_id: number;
  }

  const ticketsData: TicketData[] = [
    {
      concern: "Vehicle plate mismatch with transport manifest.",
      reply: null,
      status: "pending",
      entry_id: pendingEntryId,
      weighment_id: null,
      user_id: operator1Id,
    },
    {
      concern: "Tare weight discrepancy exceeds allowed tolerance margin.",
      reply: "Recalibrated weighbridge and re-verified tare weight.",
      status: "approved",
      entry_id: null,
      weighment_id: weighment.id,
      user_id: manager1Id,
    },
  ];

  for (const t of ticketsData) {
    const { data: created, error } = await supabase.from("tickets").insert(t).select("id").single();

    if (error || !created) {
      console.warn("  ⚠️ Failed to insert ticket:", error?.message);
    } else {
      console.log(
        `  + Created ticket (id: ${created.id}, status: ${t.status}) linked to ${
          t.entry_id ? `entry #${t.entry_id}` : `weighment #${t.weighment_id}`
        }`,
      );
    }
  }

  console.log("\n=================================================");
  console.log("🎉 Database Seeding Completed Successfully!");
  console.log("=================================================");
  console.log("📋 Test User Credentials Summary:");
  console.log("  [Factory 1]");
  console.log("  • Admin:     admin1 / admin123");
  console.log("  • Manager:   manager1 / manager123");
  console.log("  • Operator:  operator1 / operator123");
  console.log("  • Customer:  customer1 / user123");
  console.log("  • Hardware:  pi1 / hardware123");
  console.log("  [Factory 2]");
  console.log("  • Admin:     admin2 / admin123");
  console.log("  • Operator:  operator2 / operator123");
  console.log("  • Hardware:  pi2 / hardware123");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
