/**
 * @file scripts/test-seed.ts
 * @description Comprehensive database seed script for development, manual testing, and automated QA.
 * Seeds rich test datasets across factories, users (all 5 roles), centers (auto & manual),
 * commodities, rates, customers (linked & unlinked), entries (various statuses, types, dates),
 * and merged weighment pairs.
 */

import { createClient } from "@supabase/supabase-js";
import { Role, Unit, EntryStatus, EntryType, WeighmentType } from "../lib/constants/enums";
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

// Tables in reverse dependency order for clearing
const TABLES_IN_CLEAR_ORDER = [
  "weighments",
  "entries",
  "rates",
  "customers",
  "commodities",
  "centers",
  "users",
  "factories",
];

// Helper to generate ISO timestamps relative to now
function getRelativeDate(daysAgo: number, hoursAgo = 0, minutesAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  date.setMinutes(date.getMinutes() - minutesAgo);
  return date.toISOString();
}

const DEFAULT_COMMODITIES = [
  { name: "Wheat" },
  { name: "Scrap Copper" },
  { name: "Corn" },
  { name: "Crude Oil" },
  { name: "Barley" },
  { name: "Wine" },
  { name: "Cable" },
  { name: "Sugarcane" },
  { name: "Soybeans" },
  { name: "Sunflower Seeds" },
  { name: "Cotton" },
  { name: "Mustard" },
];

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60",
];

async function clearDatabase() {
  console.log("🧹 [Clean Mode] Clearing all existing records from database...");
  for (const table of TABLES_IN_CLEAR_ORDER) {
    const { error } = await supabase.from(table).delete().neq("id", 0);
    if (error) {
      if (error.code === "PGRST205") {
        console.warn(`⚠️ Table '${table}' does not exist in Supabase database schema.`);
      } else {
        console.warn(`⚠️ Could not clear table ${table}:`, error.message);
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
  console.log("🚀 Starting Comprehensive Test Seeding");
  console.log(`📡 Supabase Endpoint: ${supabaseUrl}`);
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

  // 2. USERS
  console.log("\n👥 [2/8] Seeding Users across all 5 roles...");
  console.log("  🔒 Hashing passwords with Argon2id...");
  const adminPassHash = await hashPassword("admin123");
  const managerPassHash = await hashPassword("manager123");
  const operatorPassHash = await hashPassword("operator123");
  const basePassHash = await hashPassword("user123");
  const hardwarePassHash = await hashPassword("hardware123");

  const userConfigs = [
    // Primary Factory Users
    {
      username: "admin",
      name: "System Administrator",
      role: Role.ADMIN,
      pass: adminPassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "manager_alice",
      name: "Alice Morgan (Plant Manager)",
      role: Role.MANAGER,
      pass: managerPassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "operator_bob",
      name: "Bob Jenkins (Lead Operator)",
      role: Role.OPERATOR,
      pass: operatorPassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "operator_charlie",
      name: "Charlie Davis (Scale Operator)",
      role: Role.OPERATOR,
      pass: operatorPassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "hardware_device_1",
      name: "Scale Hardware Unit 1",
      role: Role.HARDWARE,
      pass: hardwarePassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "hardware_device_2",
      name: "Scale Hardware Unit 2",
      role: Role.HARDWARE,
      pass: hardwarePassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "cust_ramesh",
      name: "Ramesh Kumar",
      role: Role.BASE,
      pass: basePassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "cust_anita",
      name: "Anita Patel",
      role: Role.BASE,
      pass: basePassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "cust_vikram",
      name: "Vikram Singh",
      role: Role.BASE,
      pass: basePassHash,
      factoryId: primaryFactoryId,
    },
    {
      username: "cust_priya",
      name: "Priya Sharma",
      role: Role.BASE,
      pass: basePassHash,
      factoryId: primaryFactoryId,
    },
    // Secondary Factory Users
    {
      username: "admin_secondary",
      name: "Apex Site Admin",
      role: Role.ADMIN,
      pass: adminPassHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "manager_bob",
      name: "Bob Vance (Apex Logistics Manager)",
      role: Role.MANAGER,
      pass: managerPassHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "operator_edward",
      name: "Edward Norton (Apex Operator)",
      role: Role.OPERATOR,
      pass: operatorPassHash,
      factoryId: secondaryFactoryId,
    },
    {
      username: "hardware_scale_apex",
      name: "Apex Scale Terminal 1",
      role: Role.HARDWARE,
      pass: hardwarePassHash,
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
          password_hash: u.pass,
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
  console.log("\n🏢 [3/8] Seeding Centers (Auto-Approve & Manual)...");
  const centerConfigs = [
    { name: "Main Weighbridge", auto_approve: false, factoryId: primaryFactoryId },
    { name: "North Automatic Scale", auto_approve: true, factoryId: primaryFactoryId },
    { name: "East Grain Terminal", auto_approve: false, factoryId: primaryFactoryId },
    { name: "South Express Bay", auto_approve: true, factoryId: primaryFactoryId },
    { name: "Apex Inbound Scale", auto_approve: true, factoryId: secondaryFactoryId },
    { name: "Apex Outbound Gate", auto_approve: false, factoryId: secondaryFactoryId },
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
      console.log(
        `  ✓ Found center: '${c.name}' (auto_approve: ${c.auto_approve}, id: ${existing.id})`,
      );
    } else {
      const { data: created, error } = await supabase
        .from("centers")
        .insert({
          name: c.name,
          auto_approve: c.auto_approve,
          factory_id: c.factoryId,
        })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create center ${c.name}`);
      centerMap.set(c.name, created.id);
      console.log(
        `  + Created center: '${c.name}' (auto_approve: ${c.auto_approve}, id: ${created.id})`,
      );
    }
  }

  // 4. COMMODITIES
  console.log("\n🌾 [4/8] Seeding Commodities Catalog...");
  const commodityMap = new Map<string, number>();

  for (const item of DEFAULT_COMMODITIES) {
    const { data: existing } = await supabase
      .from("commodities")
      .select("id")
      .eq("name", item.name)
      .maybeSingle();

    if (existing) {
      commodityMap.set(item.name, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("commodities")
        .insert({ name: item.name })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create commodity ${item.name}`);
      commodityMap.set(item.name, created.id);
    }
  }
  console.log(`  ✓ Seeded ${commodityMap.size} commodities catalog items.`);

  // 5. RATES
  console.log("\n💰 [5/8] Seeding Commodity Rates...");
  const rateConfigs = [
    { commodity: "Wheat", unit_price: "28.50", unit: Unit.KG, factoryId: primaryFactoryId },
    { commodity: "Wheat", unit_price: "2850.00", unit: Unit.Q, factoryId: primaryFactoryId },
    { commodity: "Scrap Copper", unit_price: "650.00", unit: Unit.KG, factoryId: primaryFactoryId },
    { commodity: "Corn", unit_price: "22.00", unit: Unit.KG, factoryId: primaryFactoryId },
    { commodity: "Corn", unit_price: "2200.00", unit: Unit.Q, factoryId: primaryFactoryId },
    { commodity: "Crude Oil", unit_price: "85.00", unit: Unit.GAL, factoryId: primaryFactoryId },
    { commodity: "Barley", unit_price: "19.50", unit: Unit.KG, factoryId: primaryFactoryId },
    { commodity: "Wine", unit_price: "140.00", unit: Unit.GAL, factoryId: primaryFactoryId },
    { commodity: "Cable", unit_price: "420.00", unit: Unit.KG, factoryId: primaryFactoryId },
    { commodity: "Sugarcane", unit_price: "3.80", unit: Unit.KG, factoryId: primaryFactoryId },
    { commodity: "Sugarcane", unit_price: "380.00", unit: Unit.Q, factoryId: primaryFactoryId },
    { commodity: "Soybeans", unit_price: "48.00", unit: Unit.KG, factoryId: primaryFactoryId },
    { commodity: "Cotton", unit_price: "72.00", unit: Unit.KG, factoryId: primaryFactoryId },
    // Factory 2 Rates
    { commodity: "Wheat", unit_price: "29.00", unit: Unit.KG, factoryId: secondaryFactoryId },
    { commodity: "Corn", unit_price: "21.50", unit: Unit.KG, factoryId: secondaryFactoryId },
    { commodity: "Soybeans", unit_price: "47.50", unit: Unit.KG, factoryId: secondaryFactoryId },
  ];

  const rateMap = new Map<string, number>();

  for (const r of rateConfigs) {
    const commId = commodityMap.get(r.commodity);
    if (!commId) continue;
    const rateKey = `${r.commodity}_${r.unit}_${r.factoryId}`;

    const { data: existing } = await supabase
      .from("rates")
      .select("id")
      .eq("commodity_id", commId)
      .eq("unit", r.unit)
      .eq("factory_id", r.factoryId)
      .maybeSingle();

    if (existing) {
      rateMap.set(rateKey, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("rates")
        .insert({
          commodity_id: commId,
          unit_price: r.unit_price,
          unit: r.unit,
          factory_id: r.factoryId,
        })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create rate for ${r.commodity}`);
      rateMap.set(rateKey, created.id);
    }
  }
  console.log(`  ✓ Seeded ${rateMap.size} pricing rate entries.`);

  // 6. CUSTOMERS
  console.log("\n🧑‍🌾 [6/8] Seeding Customers (Linked to Base Users and Standalone)...");
  const customerConfigs = [
    // Linked customers (Factory 1)
    {
      name: "Ramesh Kumar",
      father_name: "Suresh Kumar",
      username: "cust_ramesh",
      factoryId: primaryFactoryId,
    },
    {
      name: "Anita Patel",
      father_name: "Mahesh Patel",
      username: "cust_anita",
      factoryId: primaryFactoryId,
    },
    {
      name: "Vikram Singh",
      father_name: "Balwan Singh",
      username: "cust_vikram",
      factoryId: primaryFactoryId,
    },
    {
      name: "Priya Sharma",
      father_name: "Rajendra Sharma",
      username: "cust_priya",
      factoryId: primaryFactoryId,
    },
    // Standalone unlinked customers (Factory 1)
    {
      name: "Sunil Verma",
      father_name: "Kishan Verma",
      username: null,
      factoryId: primaryFactoryId,
    },
    {
      name: "Deepak Choudhary",
      father_name: "Ram Niwas",
      username: null,
      factoryId: primaryFactoryId,
    },
    {
      name: "Meena Devi",
      father_name: "Gopal Prasad",
      username: null,
      factoryId: primaryFactoryId,
    },
    { name: "Kavita Rao", father_name: "Jagdish Rao", username: null, factoryId: primaryFactoryId },
    // Factory 2 customers
    {
      name: "Harpreet Singh",
      father_name: "Gurdeep Singh",
      username: null,
      factoryId: secondaryFactoryId,
    },
    {
      name: "Amit Shah",
      father_name: "Jayantilal Shah",
      username: null,
      factoryId: secondaryFactoryId,
    },
  ];

  const customerMap = new Map<string, number>();

  for (const cust of customerConfigs) {
    const userId = cust.username ? userMap.get(cust.username) : null;
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("name", cust.name)
      .eq("factory_id", cust.factoryId)
      .maybeSingle();

    if (existing) {
      customerMap.set(cust.name, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("customers")
        .insert({
          name: cust.name,
          father_name: cust.father_name,
          user_id: userId,
          factory_id: cust.factoryId,
        })
        .select("id")
        .single();
      if (error || !created) throw error || new Error(`Failed to create customer ${cust.name}`);
      customerMap.set(cust.name, created.id);
    }
  }
  console.log(`  ✓ Seeded ${customerMap.size} customer profiles.`);

  // 7. ENTRIES & WEIGHMENTS (Rich scenarios spanning dates, statuses, and types)
  console.log("\n🚛 [7/8] Seeding Paired Entries and Weighments across date presets...");

  const defaultOperatorId = userMap.get("operator_bob") || userMap.get("admin")!;
  const charlieOperatorId = userMap.get("operator_charlie") || defaultOperatorId;
  const hardwareDevice1Id = userMap.get("hardware_device_1") || defaultOperatorId;

  const mainCenterId = centerMap.get("Main Weighbridge")!;
  const northAutoCenterId = centerMap.get("North Automatic Scale")!;
  const eastTerminalCenterId = centerMap.get("East Grain Terminal")!;
  const southExpressCenterId = centerMap.get("South Express Bay")!;

  const wheatRateKg = rateMap.get(`Wheat_${Unit.KG}_${primaryFactoryId}`);
  const copperRateKg = rateMap.get(`Scrap Copper_${Unit.KG}_${primaryFactoryId}`);
  const cornRateKg = rateMap.get(`Corn_${Unit.KG}_${primaryFactoryId}`);
  const wineRateGal = rateMap.get(`Wine_${Unit.GAL}_${primaryFactoryId}`);
  const sugarRateQ = rateMap.get(`Sugarcane_${Unit.Q}_${primaryFactoryId}`);
  const soyRateKg = rateMap.get(`Soybeans_${Unit.KG}_${primaryFactoryId}`);

  // Test scenarios for paired weighments
  interface WeighmentPairScenario {
    vehicleNumber: string;
    detectedVehicle?: string;
    inWeight: number;
    outWeight: number;
    customerName: string;
    centerId: number;
    userId: number;
    type: EntryType;
    autoApproved: boolean;
    edited: boolean;
    weighmentType: WeighmentType;
    unit: Unit;
    rateId?: number;
    daysAgo: number;
    inHoursAgo: number;
    outHoursAgo: number;
  }

  const weighmentPairScenarios: WeighmentPairScenario[] = [
    // Today - Wheat Inbound (Gross In -> Tare Out)
    {
      vehicleNumber: "KA-01-EA-1024",
      detectedVehicle: "KA-01-EA-1024",
      inWeight: 42500,
      outWeight: 14200,
      customerName: "Ramesh Kumar",
      centerId: northAutoCenterId,
      userId: hardwareDevice1Id,
      type: EntryType.AUTOMATIC,
      autoApproved: true,
      edited: false,
      weighmentType: WeighmentType.IN,
      unit: Unit.KG,
      rateId: wheatRateKg,
      daysAgo: 0,
      inHoursAgo: 4,
      outHoursAgo: 2,
    },
    // Today - Scrap Copper Inbound (Manual Scale)
    {
      vehicleNumber: "MH-12-PQ-9080",
      detectedVehicle: "MH-12-PQ-9080",
      inWeight: 31200,
      outWeight: 12100,
      customerName: "Anita Patel",
      centerId: mainCenterId,
      userId: defaultOperatorId,
      type: EntryType.MANUAL,
      autoApproved: false,
      edited: true,
      weighmentType: WeighmentType.IN,
      unit: Unit.KG,
      rateId: copperRateKg,
      daysAgo: 0,
      inHoursAgo: 6,
      outHoursAgo: 3,
    },
    // Yesterday - Corn Delivery (Automatic Scale)
    {
      vehicleNumber: "DL-03-CC-4421",
      detectedVehicle: "DL03CC4421", // OCR slight mismatch corrected
      inWeight: 38900,
      outWeight: 13400,
      customerName: "Vikram Singh",
      centerId: northAutoCenterId,
      userId: hardwareDevice1Id,
      type: EntryType.AUTOMATIC,
      autoApproved: true,
      edited: true,
      weighmentType: WeighmentType.IN,
      unit: Unit.KG,
      rateId: cornRateKg,
      daysAgo: 1,
      inHoursAgo: 8,
      outHoursAgo: 5,
    },
    // 2 Days Ago - Wine Tanker Outbound (Tare In -> Gross Out)
    {
      vehicleNumber: "HR-26-BR-7711",
      detectedVehicle: "HR-26-BR-7711",
      inWeight: 15600,
      outWeight: 44200,
      customerName: "Priya Sharma",
      centerId: southExpressCenterId,
      userId: defaultOperatorId,
      type: EntryType.AUTOMATIC,
      autoApproved: true,
      edited: false,
      weighmentType: WeighmentType.OUT,
      unit: Unit.GAL,
      rateId: wineRateGal,
      daysAgo: 2,
      inHoursAgo: 7,
      outHoursAgo: 4,
    },
    // 4 Days Ago (Last 7 Days) - Sugarcane Inbound (Quintals)
    {
      vehicleNumber: "GJ-06-ZZ-3312",
      detectedVehicle: "GJ-06-ZZ-3312",
      inWeight: 46800,
      outWeight: 15300,
      customerName: "Sunil Verma",
      centerId: eastTerminalCenterId,
      userId: charlieOperatorId,
      type: EntryType.MANUAL,
      autoApproved: false,
      edited: false,
      weighmentType: WeighmentType.IN,
      unit: Unit.Q,
      rateId: sugarRateQ,
      daysAgo: 4,
      inHoursAgo: 9,
      outHoursAgo: 6,
    },
    // 6 Days Ago (Last 7 Days) - Soybeans Inbound
    {
      vehicleNumber: "RJ-14-GH-6655",
      detectedVehicle: "RJ-14-GH-6655",
      inWeight: 39500,
      outWeight: 14100,
      customerName: "Deepak Choudhary",
      centerId: mainCenterId,
      userId: defaultOperatorId,
      type: EntryType.MANUAL,
      autoApproved: false,
      edited: false,
      weighmentType: WeighmentType.IN,
      unit: Unit.KG,
      rateId: soyRateKg,
      daysAgo: 6,
      inHoursAgo: 5,
      outHoursAgo: 2,
    },
    // 12 Days Ago (This Month) - Wheat Inbound
    {
      vehicleNumber: "UP-32-AB-5544",
      detectedVehicle: "UP-32-AB-5544",
      inWeight: 45100,
      outWeight: 14800,
      customerName: "Meena Devi",
      centerId: northAutoCenterId,
      userId: hardwareDevice1Id,
      type: EntryType.AUTOMATIC,
      autoApproved: true,
      edited: false,
      weighmentType: WeighmentType.IN,
      unit: Unit.KG,
      rateId: wheatRateKg,
      daysAgo: 12,
      inHoursAgo: 6,
      outHoursAgo: 3,
    },
    // 20 Days Ago (This Month) - Scrap Copper
    {
      vehicleNumber: "PB-10-XY-8899",
      detectedVehicle: "PB-10-XY-8899",
      inWeight: 28400,
      outWeight: 11900,
      customerName: "Kavita Rao",
      centerId: eastTerminalCenterId,
      userId: charlieOperatorId,
      type: EntryType.MANUAL,
      autoApproved: false,
      edited: false,
      weighmentType: WeighmentType.IN,
      unit: Unit.KG,
      rateId: copperRateKg,
      daysAgo: 20,
      inHoursAgo: 8,
      outHoursAgo: 5,
    },
    // 35 Days Ago (Past Month) - Corn Inbound
    {
      vehicleNumber: "WB-02-MM-1122",
      detectedVehicle: "WB-02-MM-1122",
      inWeight: 41200,
      outWeight: 13900,
      customerName: "Ramesh Kumar",
      centerId: mainCenterId,
      userId: defaultOperatorId,
      type: EntryType.MANUAL,
      autoApproved: false,
      edited: false,
      weighmentType: WeighmentType.IN,
      unit: Unit.KG,
      rateId: cornRateKg,
      daysAgo: 35,
      inHoursAgo: 7,
      outHoursAgo: 4,
    },
  ];

  let seededWeighmentsCount = 0;

  for (const pair of weighmentPairScenarios) {
    const custId = customerMap.get(pair.customerName);
    const inCreatedAt = getRelativeDate(pair.daysAgo, pair.inHoursAgo);
    const outCreatedAt = getRelativeDate(pair.daysAgo, pair.outHoursAgo);

    // Insert In Entry
    const { data: inEntry, error: inErr } = await supabase
      .from("entries")
      .insert({
        detected_vehicle_number: pair.detectedVehicle || pair.vehicleNumber,
        vehicle_number: pair.vehicleNumber,
        weight: pair.inWeight,
        type: pair.type,
        status: EntryStatus.APPROVED,
        auto_approved: pair.autoApproved,
        edited: pair.edited,
        center_id: pair.centerId,
        user_id: pair.userId,
        customer_id: custId || null,
        factory_id: primaryFactoryId,
        images: MOCK_IMAGES,
        created_at: inCreatedAt,
        updated_at: inCreatedAt,
      })
      .select("id")
      .single();

    if (inErr || !inEntry) {
      console.warn(`  ⚠️ Failed to create In Entry for ${pair.vehicleNumber}:`, inErr?.message);
      continue;
    }

    // Insert Out Entry
    const { data: outEntry, error: outErr } = await supabase
      .from("entries")
      .insert({
        detected_vehicle_number: pair.vehicleNumber,
        vehicle_number: pair.vehicleNumber,
        weight: pair.outWeight,
        type: pair.type,
        status: EntryStatus.APPROVED,
        auto_approved: pair.autoApproved,
        edited: false,
        center_id: pair.centerId,
        user_id: pair.userId,
        customer_id: custId || null,
        factory_id: primaryFactoryId,
        images: MOCK_IMAGES,
        created_at: outCreatedAt,
        updated_at: outCreatedAt,
      })
      .select("id")
      .single();

    if (outErr || !outEntry) {
      console.warn(`  ⚠️ Failed to create Out Entry for ${pair.vehicleNumber}:`, outErr?.message);
      continue;
    }

    // Insert Weighment linking In + Out
    const { error: wErr } = await supabase.from("weighments").insert({
      in_entry_id: inEntry.id,
      out_entry_id: outEntry.id,
      unit: pair.unit,
      type: pair.weighmentType,
      rate_id: pair.rateId || null,
      created_at: outCreatedAt,
      updated_at: outCreatedAt,
    });

    if (wErr) {
      console.warn(`  ⚠️ Failed to link weighment for ${pair.vehicleNumber}:`, wErr.message);
    } else {
      seededWeighmentsCount++;
    }
  }

  console.log(`  ✓ Successfully created ${seededWeighmentsCount} merged double-entry weighments.`);

  // 8. UNPAIRED ENTRIES (Pending, Rejected, In-Progress Approved)
  console.log(
    "\n📋 [8/8] Seeding Standalone Unpaired Entries (Pending, Rejected, Active On-Site)...",
  );

  const standaloneEntries = [
    // 1. Pending Manual Entry (Needs operator approval) - Today
    {
      vehicle_number: "TN-09-KK-4455",
      detected_vehicle_number: "TN-09-KK-4455",
      weight: 38200,
      type: EntryType.MANUAL,
      status: EntryStatus.PENDING,
      auto_approved: false,
      edited: false,
      center_id: mainCenterId,
      user_id: defaultOperatorId,
      customer_id: customerMap.get("Anita Patel"),
      factory_id: primaryFactoryId,
      images: MOCK_IMAGES,
      created_at: getRelativeDate(0, 1),
    },
    // 2. Pending Automatic Entry (Manual review queue due to OCR mismatch) - Today
    {
      vehicle_number: "TS-07-EE-9988",
      detected_vehicle_number: "TS07EE9988",
      weight: 44100,
      type: EntryType.AUTOMATIC,
      status: EntryStatus.PENDING,
      auto_approved: false,
      edited: false,
      center_id: northAutoCenterId,
      user_id: hardwareDevice1Id,
      customer_id: customerMap.get("Vikram Singh"),
      factory_id: primaryFactoryId,
      images: MOCK_IMAGES,
      created_at: getRelativeDate(0, 2),
    },
    // 3. Rejected Entry (Excess weight / Security flag) - Yesterday
    {
      vehicle_number: "AP-28-FF-6677",
      detected_vehicle_number: "AP-28-FF-6677",
      weight: 62500, // Gross overload
      type: EntryType.AUTOMATIC,
      status: EntryStatus.REJECTED,
      auto_approved: false,
      edited: true,
      center_id: southExpressCenterId,
      user_id: charlieOperatorId,
      customer_id: customerMap.get("Sunil Verma"),
      factory_id: primaryFactoryId,
      images: MOCK_IMAGES,
      created_at: getRelativeDate(1, 4),
    },
    // 4. Rejected Manual Entry (Plate mismatch / bad manifest) - 3 Days Ago
    {
      vehicle_number: "KL-07-CD-3344",
      detected_vehicle_number: "KL-07-CD-3300",
      weight: 29800,
      type: EntryType.MANUAL,
      status: EntryStatus.REJECTED,
      auto_approved: false,
      edited: false,
      center_id: eastTerminalCenterId,
      user_id: defaultOperatorId,
      customer_id: customerMap.get("Deepak Choudhary"),
      factory_id: primaryFactoryId,
      images: [],
      created_at: getRelativeDate(3, 6),
    },
    // 5. Active On-Site Entry (Approved Gross Inbound, awaiting exit Tare weighment) - Today
    {
      vehicle_number: "MH-04-AB-1212",
      detected_vehicle_number: "MH-04-AB-1212",
      weight: 41900,
      type: EntryType.AUTOMATIC,
      status: EntryStatus.APPROVED,
      auto_approved: true,
      edited: false,
      center_id: northAutoCenterId,
      user_id: hardwareDevice1Id,
      customer_id: customerMap.get("Ramesh Kumar"),
      factory_id: primaryFactoryId,
      images: MOCK_IMAGES,
      created_at: getRelativeDate(0, 1, 30),
    },
    // 6. Active On-Site Entry (Approved Tare Inbound for loading, awaiting gross weighment) - Today
    {
      vehicle_number: "DL-01-XY-7890",
      detected_vehicle_number: "DL-01-XY-7890",
      weight: 13800,
      type: EntryType.MANUAL,
      status: EntryStatus.APPROVED,
      auto_approved: false,
      edited: false,
      center_id: mainCenterId,
      user_id: defaultOperatorId,
      customer_id: customerMap.get("Priya Sharma"),
      factory_id: primaryFactoryId,
      images: [],
      created_at: getRelativeDate(0, 0, 45),
    },
    // 7. Secondary Factory Entry (Apex Inbound) - Yesterday
    {
      vehicle_number: "GJ-01-AB-9900",
      detected_vehicle_number: "GJ-01-AB-9900",
      weight: 37600,
      type: EntryType.AUTOMATIC,
      status: EntryStatus.APPROVED,
      auto_approved: true,
      edited: false,
      center_id: centerMap.get("Apex Inbound Scale")!,
      user_id: userMap.get("hardware_scale_apex")!,
      customer_id: customerMap.get("Harpreet Singh"),
      factory_id: secondaryFactoryId,
      images: MOCK_IMAGES,
      created_at: getRelativeDate(1, 3),
    },
  ];

  let standaloneCount = 0;
  for (const ent of standaloneEntries) {
    const { error } = await supabase.from("entries").insert({
      ...ent,
      updated_at: ent.created_at,
    });
    if (!error) standaloneCount++;
  }
  console.log(`  ✓ Seeded ${standaloneCount} standalone and edge-case entries.`);

  console.log("\n=================================================");
  console.log("🎉 Test Database Seeding Completed Successfully!");
  console.log("=================================================");
  console.log("📋 Test User Credentials Summary:");
  console.log("  • Admin:      admin / admin123 (Factory 1)");
  console.log("  • Manager:    manager_alice / manager123 (Factory 1)");
  console.log("  • Operator:   operator_bob / operator123 (Factory 1)");
  console.log("  • Operator:   operator_charlie / operator123 (Factory 1)");
  console.log("  • Hardware:   hardware_device_1 / hardware123 (Factory 1)");
  console.log("  • Customer:   cust_ramesh / user123 (Factory 1)");
  console.log("  • Apex Admin: admin_secondary / admin123 (Factory 2)");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("❌ Test seeding failed:", err);
  process.exit(1);
});
