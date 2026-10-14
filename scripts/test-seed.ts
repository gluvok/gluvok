/**
 * @file scripts/test-seed.ts
 * @description High-volume database seed script for development, pagination, and testing.
 * Seeds rich test datasets across factories, users (all 5 roles), centers,
 * commodities, customers, entries (paired & standalone), weighments, and support tickets
 * matching schema.sql with staggered timestamps for authentic pagination & sorting.
 */

import argon2 from "argon2";
import { supabase } from "./supabase.ts";

type Role = "admin" | "manager" | "operator" | "base" | "hardware" | "customer";
type Unit = "kg" | "q" | "gal";
type WeighmentType = "unassigned" | "in" | "out";
type TicketStatus = "pending" | "approved" | "rejected";

const TABLES_IN_CLEAR_ORDER = [
  "tickets",
  "weighments",
  "entries",
  "sessions",
  "commodities",
  "centers",
  "users",
  "factories",
];

/**
 * Returns an ISO timestamp offset by `days` days and `minutesOffset` minutes into the past.
 */
function daysAgo(days: number, minutesOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setMinutes(d.getMinutes() - minutesOffset);
  return d.toISOString();
}

/**
 * Clear all existing records and reset sequences.
 */
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
  console.log("🚀 Starting GluVok High-Volume Test Database Seeding");
  console.log(`📡 Supabase Endpoint: ${process.env.SUPABASE_URL}`);
  console.log(`🧹 Clean Mode: ${shouldClean ? "ENABLED" : "DISABLED"}`);
  console.log("=================================================");

  if (shouldClean) {
    await clearDatabase();
  }

  // 1. FACTORIES (2 Factories)
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

  // 2. USERS (28 Users across all 5 roles)
  console.log("\n👥 [2/8] Seeding Users (28 personnel & client profiles)...");
  console.log("  🔒 Pre-hashing role passwords once with Argon2id...");
  const [adminHash, managerHash, operatorHash, userHash, hardwareHash] = await Promise.all([
    argon2.hash("admin123"),
    argon2.hash("manager123"),
    argon2.hash("operator123"),
    argon2.hash("user123"),
    argon2.hash("hardware123"),
  ]);

  interface UserSeedConfig {
    username: string;
    name: string;
    role: Role;
    passwordHash: string;
    factoryId: number;
  }

  const userConfigs: UserSeedConfig[] = [
    // Factory 1 Core & Staff
    {
      username: "admin1",
      name: "Admin Factory 1",
      role: "admin",
      passwordHash: adminHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "manager1",
      name: "Operations Manager 1",
      role: "manager",
      passwordHash: managerHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "operator1",
      name: "Main Scale Operator",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "operator3",
      name: "Inbound Gate Operator",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "operator4",
      name: "Silo Platform Operator",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "operator5",
      name: "Night Shift Operator",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "pi1",
      name: "Hardware Scale - Main Weighbridge",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "pi3",
      name: "Hardware Scale - North Automatic",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "pi4",
      name: "Hardware Scale - South Gate",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "pi5",
      name: "Hardware Scale - East Inbound",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "pi6",
      name: "Hardware Scale - West Outbound",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: primaryFactoryId,
    },

    // Factory 2 Core & Staff
    {
      username: "admin2",
      name: "Admin Factory 2",
      role: "admin",
      passwordHash: adminHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "manager2",
      name: "Apex Logistics Manager",
      role: "manager",
      passwordHash: managerHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "operator2",
      name: "Apex Terminal Operator 1",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "operator6",
      name: "Apex Terminal Operator 2",
      role: "operator",
      passwordHash: operatorHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "pi2",
      name: "Hardware Scale - Apex Terminal 1",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "pi7",
      name: "Hardware Scale - Apex South Scale",
      role: "hardware",
      passwordHash: hardwareHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "pi8",
      name: "Hardware Scale - Apex East Gate",
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
    }
  }
  console.log(`  ✓ Seeded ${userMap.size} users across all 5 roles.`);

  // 3. CENTERS (50 Centers: 35 for Factory 1, 15 for Factory 2)
  console.log("\n🏢 [3/8] Seeding 50 Centers (enabling rich multi-page pagination)...");
  const factory1CenterNames = [
    "Main Weighbridge",
    "North Automatic Scale",
    "South Gate Weighbridge",
    "East Inbound Scale",
    "West Outbound Scale",
    "Grain Silo Platform 1",
    "Grain Silo Platform 2",
    "Fertilizer Bulk Terminal",
    "Rail Inflow Weighbridge",
    "Central Logistics Platform",
    "North-East Weighbridge A",
    "North-East Weighbridge B",
    "South-West Rapid Scale",
    "Automated Bypass Scale 1",
    "Automated Bypass Scale 2",
    "Processing Unit 1 Scale",
    "Processing Unit 2 Scale",
    "Bulk Hopper Weighbridge",
    "Container Yard Scale A",
    "Container Yard Scale B",
    "Liquid Terminal Scale",
    "Feed Mill Weighbridge",
    "Storage Silo Scale 3",
    "Storage Silo Scale 4",
    "Express Exit Platform",
    "Raw Material Inflow Scale",
    "Finished Goods Scale",
    "Secondary Gate Weighbridge",
    "Dispatch Weighbridge 1",
    "Dispatch Weighbridge 2",
    "Heavy Freight Weighbridge",
    "Quality Check Scale",
    "Tare Verification Scale",
    "Reserve Auxiliary Scale",
    "Emergency Overflow Scale",
  ];

  const factory2CenterNames = [
    "Apex Terminal 1",
    "Apex South Scale",
    "Apex East Gate Platform",
    "Apex Railhead Scale",
    "Apex Bulk Grain Terminal",
    "Apex Automated Scale A",
    "Apex Automated Scale B",
    "Apex Silo Weighbridge",
    "Apex Express Scale",
    "Apex Inbound Platform 2",
    "Apex Outbound Platform 2",
    "Apex Dispatch Scale",
    "Apex Freight Yard Bridge",
    "Apex Auxiliary Scale",
    "Apex Inspection Scale",
  ];

  interface CenterInsertData {
    name: string;
    factory_id: number;
    created_at: string;
  }

  const centersToInsert: CenterInsertData[] = [];

  factory1CenterNames.forEach((name, idx) => {
    centersToInsert.push({
      name,
      factory_id: primaryFactoryId,
      created_at: daysAgo(50 - idx, idx * 12),
    });
  });

  factory2CenterNames.forEach((name, idx) => {
    centersToInsert.push({
      name,
      factory_id: secondaryFactoryId,
      created_at: daysAgo(30 - idx, idx * 18),
    });
  });

  const centerMap = new Map<string, number>();

  for (const c of centersToInsert) {
    const { data: existing } = await supabase
      .from("centers")
      .select("id")
      .eq("name", c.name)
      .eq("factory_id", c.factory_id)
      .maybeSingle();

    if (existing) {
      centerMap.set(c.name, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("centers")
        .insert(c)
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create center ${c.name}`);
      centerMap.set(c.name, created.id);
    }
  }
  console.log(`  ✓ Seeded ${centerMap.size} centers (35 Default Factory, 15 Apex Agro Logistics).`);

  // 4. COMMODITIES (20 Agricultural Commodities)
  console.log("\n🌾 [4/8] Seeding 20 Commodities...");
  const commodityNames = [
    "Wheat",
    "Corn",
    "Soybeans",
    "Sugarcane",
    "Cotton",
    "Rice",
    "Barley",
    "Sorghum",
    "Oats",
    "Sunflower Seed",
    "Canola",
    "Mustard Seed",
    "Groundnut",
    "Coffee Beans",
    "Tea Leaves",
    "Chickpeas",
    "Red Lentils",
    "Pigeon Peas",
    "Jowar",
    "Bajra",
  ];

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

  // 5. CUSTOMERS (50 Customer Profiles)
  console.log("\n🧑‍🌾 [5/8] Seeding 50 Customers...");
  const customerRawConfigs: Array<{
    name: string;
    username: string | null;
    factoryId: number;
    daysOffset: number;
  }> = [
    // Factory 1 Customers
    {
      name: "Ramesh Kumar",
      username: "customer1",
      factoryId: primaryFactoryId,
      daysOffset: 45,
    },
    {
      name: "Anita Sharma",
      username: "customer2",
      factoryId: primaryFactoryId,
      daysOffset: 44,
    },
    {
      name: "Suresh Patel",
      username: "customer3",
      factoryId: primaryFactoryId,
      daysOffset: 43,
    },
    {
      name: "Rajendra Singh",
      username: "customer4",
      factoryId: primaryFactoryId,
      daysOffset: 42,
    },
    {
      name: "Vikram Rathore",
      username: "customer5",
      factoryId: primaryFactoryId,
      daysOffset: 41,
    },
    {
      name: "Pooja Verma",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 40,
    },
    {
      name: "Devendra Yadav",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 39,
    },
    {
      name: "Kavita Choudhary",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 38,
    },
    {
      name: "Sunil Deshmukh",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 37,
    },
    {
      name: "Prakash Joshi",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 36,
    },
    {
      name: "Mahesh Kulkarni",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 35,
    },
    {
      name: "Geeta Meena",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 34,
    },
    {
      name: "Harish Rawat",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 33,
    },
    {
      name: "Manoj Tiwari",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 32,
    },
    {
      name: "Anil Chauhan",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 31,
    },
    {
      name: "Babulal Gurjar",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 30,
    },
    {
      name: "Santosh Dhakad",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 29,
    },
    {
      name: "Mukesh Bhati",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 28,
    },
    {
      name: "Dharmendra Saini",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 27,
    },
    {
      name: "Rajeshwari Bai",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 26,
    },
    {
      name: "Jagdish Bishnoi",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 25,
    },
    {
      name: "Kailash Mali",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 24,
    },
    {
      name: "Govind Dan",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 23,
    },
    {
      name: "Bhawani Singh",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 22,
    },
    {
      name: "Manish Solanki",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 21,
    },
    {
      name: "Gopal Agarwal",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 20,
    },
    {
      name: "Nandkishore Vyas",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 19,
    },
    {
      name: "Kamla Devi",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 18,
    },
    {
      name: "Mohanlal Kumhar",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 17,
    },
    {
      name: "Ramswaroop Jat",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 16,
    },
    {
      name: "Bhagwan Sahay",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 15,
    },
    {
      name: "Shyam Sundar",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 14,
    },
    {
      name: "Ratan Lal",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 13,
    },
    {
      name: "Narendra Modi Logistics",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 12,
    },
    {
      name: "Suraj Agro Traders",
      username: null,
      factoryId: primaryFactoryId,
      daysOffset: 11,
    },

    // Factory 2 Customers
    {
      name: "Apex Agritech Co.",
      username: "customer6",
      factoryId: secondaryFactoryId,
      daysOffset: 30,
    },
    {
      name: "Kalyan Krishi Kendra",
      username: "customer7",
      factoryId: secondaryFactoryId,
      daysOffset: 28,
    },
    {
      name: "Vidarbha Agro Farms",
      username: "customer8",
      factoryId: secondaryFactoryId,
      daysOffset: 26,
    },
    {
      name: "Marathwada Bio Fuels",
      username: "customer9",
      factoryId: secondaryFactoryId,
      daysOffset: 24,
    },
    {
      name: "Deccan Grain Carriers",
      username: "customer10",
      factoryId: secondaryFactoryId,
      daysOffset: 22,
    },
    {
      name: "Sahyadri Agro Allied",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 20,
    },
    {
      name: "Baramati FPO",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 18,
    },
    {
      name: "Godavari Agro Exporters",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 16,
    },
    {
      name: "Krishna Valley Mills",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 14,
    },
    {
      name: "Western Agro Terminal",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 12,
    },
    {
      name: "Satpura Crop Sciences",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 10,
    },
    {
      name: "Panchganga Seed Co.",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 8,
    },
    {
      name: "Narmada Agri Products",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 6,
    },
    {
      name: "Malwa Agro Consortium",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 4,
    },
    {
      name: "Chambal Grain Storage",
      username: null,
      factoryId: secondaryFactoryId,
      daysOffset: 2,
    },
  ];

  const customerMap = new Map<string, number>();

  for (let i = 0; i < customerRawConfigs.length; i++) {
    const cust = customerRawConfigs[i];
    const username = cust.username ?? `customer${i + 1}`;
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      customerMap.set(cust.name, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("users")
        .insert({
          username,
          name: cust.name,
          role: "customer",
          password_hash: userHash,
          factory_id: cust.factoryId,
          created_at: daysAgo(cust.daysOffset, 25),
        })
        .select("id")
        .single();
      if (error || !created)
        throw error || new Error(`Failed to create customer user ${cust.name}`);
      customerMap.set(cust.name, created.id);
    }
  }
  console.log(`  ✓ Seeded ${customerMap.size} customer accounts in users table.`);

  // Helpers to get arrays of IDs for relationships
  const factory1CenterIds = factory1CenterNames.map((n) => centerMap.get(n)!);
  const factory2CenterIds = factory2CenterNames.map((n) => centerMap.get(n)!);
  const customerIdsArray = Array.from(customerMap.values());

  const operator1Id = userMap.get("operator1")!;
  const operator3Id = userMap.get("operator3")!;
  const manager1Id = userMap.get("manager1")!;
  const pi1Id = userMap.get("pi1")!;

  const operator2Id = userMap.get("operator2")!;
  const pi2Id = userMap.get("pi2")!;

  // 6. PAIRED ENTRIES & WEIGHMENTS (30 Pairs = 60 Entries & 30 Weighments)
  console.log("\n🚛 [6/8] Seeding 30 Paired Inbound/Outbound Entries and Linked Weighments...");
  const pairedVehicles: Array<{
    vehicle: string;
    factoryId: number;
    centerId: number;
    customerId: number;
    operatorId: number;
    grossWeight: number;
    tareWeight: number;
    daysOffset: number;
  }> = [];

  // 20 Paired vehicles in Factory 1
  for (let i = 1; i <= 20; i++) {
    const vehicleNum = `MH12AB${1000 + i}`;
    const centerId = factory1CenterIds[i % factory1CenterIds.length];
    const customerId = customerIdsArray[i % 35]; // Factory 1 customer
    const gross = 28000 + ((i * 950) % 22000); // 28,000 - 50,000 kg
    const tare = 9000 + ((i * 350) % 6500); // 9,000 - 15,500 kg
    pairedVehicles.push({
      vehicle: vehicleNum,
      factoryId: primaryFactoryId,
      centerId,
      customerId,
      operatorId: i % 2 === 0 ? operator1Id : operator3Id,
      grossWeight: gross,
      tareWeight: tare,
      daysOffset: 32 - i,
    });
  }

  // 10 Paired vehicles in Factory 2
  for (let i = 1; i <= 10; i++) {
    const vehicleNum = `MH14CD${2000 + i}`;
    const centerId = factory2CenterIds[i % factory2CenterIds.length];
    const customerId = customerIdsArray[35 + (i % 15)]; // Factory 2 customer
    const gross = 30000 + ((i * 800) % 20000);
    const tare = 10000 + ((i * 300) % 5500);
    pairedVehicles.push({
      vehicle: vehicleNum,
      factoryId: secondaryFactoryId,
      centerId,
      customerId,
      operatorId: operator2Id,
      grossWeight: gross,
      tareWeight: tare,
      daysOffset: 20 - i,
    });
  }

  interface EntryInsert {
    vehicle_number: string;
    detected_vehicle_number: string;
    weight: number;
    center_id: number;
    customer_id: number;
    factory_id: number;
    created_by: number;
    images: string[];
    created_at: string;
  }

  const inEntriesToInsert: EntryInsert[] = [];
  const outEntriesToInsert: EntryInsert[] = [];

  for (const pv of pairedVehicles) {
    inEntriesToInsert.push({
      vehicle_number: pv.vehicle,
      detected_vehicle_number: pv.vehicle,
      weight: pv.grossWeight,
      center_id: pv.centerId,
      customer_id: pv.customerId,
      factory_id: pv.factoryId,
      created_by: pv.operatorId,
      images: [],
      created_at: daysAgo(pv.daysOffset, 120),
    });

    outEntriesToInsert.push({
      vehicle_number: pv.vehicle,
      detected_vehicle_number: pv.vehicle,
      weight: pv.tareWeight,
      center_id: pv.centerId,
      customer_id: pv.customerId,
      factory_id: pv.factoryId,
      created_by: pv.operatorId,
      images: [],
      created_at: daysAgo(pv.daysOffset, 0),
    });
  }

  const { data: createdInEntries, error: inErr } = await supabase
    .from("entries")
    .insert(inEntriesToInsert)
    .select("id");

  if (inErr || !createdInEntries) {
    throw inErr || new Error("Failed to bulk insert inbound entries");
  }

  const { data: createdOutEntries, error: outErr } = await supabase
    .from("entries")
    .insert(outEntriesToInsert)
    .select("id");

  if (outErr || !createdOutEntries) {
    throw outErr || new Error("Failed to bulk insert outbound entries");
  }

  // Create linked weighments
  interface WeighmentInsert {
    in_entry_id: number;
    out_entry_id: number;
    unit: Unit;
    type: WeighmentType;
    created_at: string;
  }

  const weighmentsToInsert: WeighmentInsert[] = [];
  for (let i = 0; i < createdInEntries.length; i++) {
    const pv = pairedVehicles[i];
    weighmentsToInsert.push({
      in_entry_id: createdInEntries[i].id,
      out_entry_id: createdOutEntries[i].id,
      unit: "kg",
      type: i % 4 === 0 ? "out" : i % 7 === 0 ? "unassigned" : "in",
      created_at: daysAgo(pv.daysOffset, 0),
    });
  }

  const { data: createdWeighments, error: weighmentErr } = await supabase
    .from("weighments")
    .insert(weighmentsToInsert)
    .select("id");

  if (weighmentErr || !createdWeighments) {
    throw weighmentErr || new Error("Failed to bulk insert weighments");
  }

  console.log(
    `  ✓ Created ${createdWeighments.length} weighments linking ${createdInEntries.length} inbound and ${createdOutEntries.length} outbound entries.`,
  );

  // 7. STANDALONE UNPAIRED ENTRIES (40 Entries: Pending, Auto-Approved, Rejected)
  console.log(
    "\n📋 [7/8] Seeding 40 Standalone Entries (20 Pending, 10 Auto-Approved, 10 Rejected)...",
  );
  interface StandaloneEntryData {
    vehicle_number: string;
    detected_vehicle_number: string;
    weight: number;
    center_id: number;
    customer_id: number | null;
    factory_id: number;
    created_by: number;
    images: string[];
    created_at: string;
  }

  const standaloneEntriesToInsert: StandaloneEntryData[] = [];

  // 20 Inbound Standalone Entries
  for (let i = 1; i <= 20; i++) {
    const plate = `DL01XY${3000 + i}`;
    const factoryId = i <= 14 ? primaryFactoryId : secondaryFactoryId;
    const centerList = factoryId === primaryFactoryId ? factory1CenterIds : factory2CenterIds;
    const centerId = centerList[i % centerList.length];
    const customerId = i % 3 === 0 ? null : customerIdsArray[i % customerIdsArray.length];
    const operatorId = factoryId === primaryFactoryId ? operator1Id : operator2Id;

    standaloneEntriesToInsert.push({
      vehicle_number: plate,
      detected_vehicle_number: plate,
      weight: 18000 + ((i * 1150) % 25000),
      center_id: centerId,
      customer_id: customerId,
      factory_id: factoryId,
      created_by: operatorId,
      images: [],
      created_at: daysAgo(Math.floor(i / 4), (i * 37) % 60),
    });
  }

  // 10 Hardware Scale Standalone Entries
  for (let i = 1; i <= 10; i++) {
    const plate = `KA04CD${4000 + i}`;
    const factoryId = i <= 6 ? primaryFactoryId : secondaryFactoryId;
    const centerList = factoryId === primaryFactoryId ? factory1CenterIds : factory2CenterIds;
    const centerId = centerList[i % centerList.length];
    const piId = factoryId === primaryFactoryId ? pi1Id : pi2Id;

    standaloneEntriesToInsert.push({
      vehicle_number: plate,
      detected_vehicle_number: plate,
      weight: 20000 + ((i * 1250) % 18000),
      center_id: centerId,
      customer_id: customerIdsArray[(i * 3) % customerIdsArray.length],
      factory_id: factoryId,
      created_by: piId,
      images: [],
      created_at: daysAgo(5 + i, (i * 45) % 60),
    });
  }

  // 10 Outbound Standalone Entries
  for (let i = 1; i <= 10; i++) {
    const plate = `GJ03EF${5000 + i}`;
    const factoryId = i <= 7 ? primaryFactoryId : secondaryFactoryId;
    const centerList = factoryId === primaryFactoryId ? factory1CenterIds : factory2CenterIds;
    const centerId = centerList[i % centerList.length];
    const operatorId = factoryId === primaryFactoryId ? operator1Id : operator2Id;

    standaloneEntriesToInsert.push({
      vehicle_number: plate,
      detected_vehicle_number: plate,
      weight: 14000 + ((i * 2100) % 36000),
      center_id: centerId,
      customer_id: null,
      factory_id: factoryId,
      created_by: operatorId,
      images: [],
      created_at: daysAgo(8 + i, (i * 50) % 60),
    });
  }

  const { data: createdStandaloneEntries, error: standaloneErr } = await supabase
    .from("entries")
    .insert(standaloneEntriesToInsert)
    .select("id");

  if (standaloneErr || !createdStandaloneEntries) {
    throw standaloneErr || new Error("Failed to bulk insert standalone entries");
  }

  console.log(
    `  ✓ Created ${createdStandaloneEntries.length} standalone entries (Total Entries: ${
      createdInEntries.length + createdOutEntries.length + createdStandaloneEntries.length
    }).`,
  );

  // 8. TICKETS (40 Support Tickets: 20 linked to entries, 20 linked to weighments)
  console.log("\n🎫 [8/8] Seeding 40 Support Tickets (Constraint Validated)...");
  interface TicketInsert {
    concern: string;
    reply: string | null;
    status: TicketStatus;
    entry_id: number | null;
    weighment_id: number | null;
    user_id: number;
    created_at: string;
  }

  const ticketConcerns = [
    {
      concern: "Vehicle plate mismatch with transport manifest.",
      reply: "Verified physical gate register; operator corrected plate.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Tare weight discrepancy exceeds allowed ±20kg tolerance margin.",
      reply: "Recalibrated weighbridge and re-verified tare weight.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Driver disputed net weight recorded on outbound receipt.",
      reply: null,
      status: "pending" as TicketStatus,
    },
    {
      concern: "Camera 1 crop obscured by mud spatter on lens.",
      reply: "Cleaned optical sensor housing; test frame verified.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Moisture rebate query from farmer on grain shipment.",
      reply: null,
      status: "pending" as TicketStatus,
    },
    {
      concern: "Gross weight exceeds legal highway payload rating (50MT).",
      reply: "Excess cargo offloaded at auxiliary depot prior to transit.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Scale indicator oscillated due to high crosswinds.",
      reply: "Wind deflectors inspected and tightened.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "OCR failed to read obscured rear number plate.",
      reply: null,
      status: "pending" as TicketStatus,
    },
    {
      concern: "Entry submitted with incorrect commodity destination center.",
      reply: "Re-routed shipment to Silo Unit 2.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Duplicate inbound ticket generated during network timeout.",
      reply: "Duplicate entry voided by shift supervisor.",
      status: "rejected" as TicketStatus,
    },
    {
      concern: "Driver attempted re-entry without clearing outbound tare.",
      reply: "Vehicle turned back to outbound scale for proper cycle.",
      status: "rejected" as TicketStatus,
    },
    {
      concern: "Hardware scale disconnected from network during weighment.",
      reply: null,
      status: "pending" as TicketStatus,
    },
    {
      concern: "Uncalibrated zero-point offset detected during morning zero check.",
      reply: "Zero-point balanced by weighing technician.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Customer account mapping missing on delivery challan.",
      reply: null,
      status: "pending" as TicketStatus,
    },
    {
      concern: "Axle sensor trigger skipped second trailer axle.",
      reply: "Multi-axle bridge sequencing sensor adjusted.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Driver requested duplicate printed receipt copy.",
      reply: "Reprint issued with duplicate watermark.",
      status: "approved" as TicketStatus,
    },
    {
      concern: "Unregistered transport carrier entered facility.",
      reply: "Vehicle redirected to visitor registration kiosk.",
      status: "rejected" as TicketStatus,
    },
    {
      concern: "Tare weight lighter than expected for truck empty chassis.",
      reply: null,
      status: "pending" as TicketStatus,
    },
    {
      concern: "Customer disputed commodity deduction grade.",
      reply: "Quality control lab sample re-tested; confirmed grade B.",
      status: "rejected" as TicketStatus,
    },
    {
      concern: "Weighbridge surface debris accumulation warning.",
      reply: "Platform power-washed and inspected for zero stability.",
      status: "approved" as TicketStatus,
    },
  ];

  const ticketsToInsert: TicketInsert[] = [];

  // 20 Tickets linked to standalone entries (entry_id set, weighment_id null)
  for (let i = 0; i < 20; i++) {
    const entryId = createdStandaloneEntries[i].id;
    const template = ticketConcerns[i % ticketConcerns.length];
    ticketsToInsert.push({
      concern: template.concern,
      reply: template.reply,
      status: template.status,
      entry_id: entryId,
      weighment_id: null,
      user_id: i % 2 === 0 ? operator1Id : manager1Id,
      created_at: daysAgo(10 - Math.floor(i / 2), (i * 20) % 60),
    });
  }

  // 20 Tickets linked to weighments (entry_id null, weighment_id set)
  for (let i = 0; i < 20; i++) {
    const weighmentId = createdWeighments[i].id;
    const template = ticketConcerns[(i + 5) % ticketConcerns.length];
    ticketsToInsert.push({
      concern: `[Weighment #${weighmentId}] ${template.concern}`,
      reply: template.reply,
      status: template.status,
      entry_id: null,
      weighment_id: weighmentId,
      user_id: i % 2 === 0 ? manager1Id : operator1Id,
      created_at: daysAgo(15 - Math.floor(i / 2), (i * 25) % 60),
    });
  }

  const { data: createdTickets, error: ticketErr } = await supabase
    .from("tickets")
    .insert(ticketsToInsert)
    .select("id");

  if (ticketErr || !createdTickets) {
    throw ticketErr || new Error("Failed to bulk insert tickets");
  }

  console.log(`  ✓ Seeded ${createdTickets.length} support tickets.`);

  console.log("\n=================================================");
  console.log("🎉 Database Seeding Completed Successfully!");
  console.log("=================================================");
  console.log("📊 Summary of Seeded Data Volumes:");
  console.log(`  • Factories:   ${factoryMap.size}`);
  console.log(`  • Users:       ${userMap.size} (Admin, Manager, Operator, Base, Hardware)`);
  console.log(`  • Centers:     ${centerMap.size} (Ideal for multi-page pagination testing)`);
  console.log(`  • Commodities: ${commodityMap.size}`);
  console.log(`  • Customers:   ${customerMap.size}`);
  console.log(
    `  • Entries:     ${createdInEntries.length + createdOutEntries.length + createdStandaloneEntries.length} (${createdInEntries.length + createdOutEntries.length} paired, ${createdStandaloneEntries.length} standalone)`,
  );
  console.log(`  • Weighments:  ${createdWeighments.length} (Linked paired cycles)`);
  console.log(`  • Tickets:     ${createdTickets.length} (20 linked to entries, 20 to weighments)`);
  console.log("=================================================");
  console.log("📋 Test User Credentials Summary:");
  console.log("  [Factory 1: Default Factory]");
  console.log("  • Admin:     admin1 / admin123");
  console.log("  • Manager:   manager1 / manager123");
  console.log("  • Operator:  operator1, operator3, operator4, operator5 / operator123");
  console.log("  • Customer:  customer1, customer2, customer3, customer4, customer5 / user123");
  console.log("  • Hardware:  pi1, pi3, pi4, pi5, pi6 / hardware123");
  console.log("  [Factory 2: Apex Agro Logistics]");
  console.log("  • Admin:     admin2 / admin123");
  console.log("  • Manager:   manager2 / manager123");
  console.log("  • Operator:  operator2, operator6 / operator123");
  console.log("  • Customer:  customer6, customer7, customer8, customer9, customer10 / user123");
  console.log("  • Hardware:  pi2, pi7, pi8 / hardware123");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
