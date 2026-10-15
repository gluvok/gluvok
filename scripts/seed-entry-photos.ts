/**
 * @file scripts/seed-entry-photos.ts
 * @description Uploads sample transport photos to the 'test' Supabase storage bucket
 * and links their public URLs to entries in the database.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Realistic transport and weighbridge sample photos
const SAMPLE_PHOTOS = [
  {
    name: "entry_truck_front.jpg",
    url: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80",
    label: "Front Vehicle View (MH12AB1001)",
  },
  {
    name: "entry_weighbridge_scale.jpg",
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    label: "Gross Scale Platform & Axle Reading",
  },
  {
    name: "entry_cargo_inspection.jpg",
    url: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=80",
    label: "Rear Cargo Inspection (Bagged Grain)",
  },
  {
    name: "entry_delivery_manifest.jpg",
    url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
    label: "Signed Weighbridge Delivery Slip",
  },
];

async function seedPhotos() {
  console.log("🚚 Starting Entry Photos Seeding...");
  console.log(`📡 Supabase Endpoint: ${supabaseUrl}`);

  // 1. Fetch images as buffers
  const uploadedUrls: string[] = [];

  for (const photo of SAMPLE_PHOTOS) {
    try {
      console.log(`⬇️ Downloading sample asset: ${photo.name}...`);
      const res = await fetch(photo.url);
      if (!res.ok) {
        console.warn(`Failed to fetch ${photo.url}, status: ${res.status}`);
        uploadedUrls.push(photo.url);
        continue;
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`⬆️ Uploading to Supabase Storage bucket 'test': ${photo.name}...`);
      const uploadRes = await supabase.storage.from("test").upload(photo.name, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

      if (uploadRes.error) {
        console.warn(`⚠️ Storage upload for ${photo.name} failed (${uploadRes.error.message}).`);
        console.warn(`ℹ️ Using direct fallback CDN URL: ${photo.url}`);
        uploadedUrls.push(photo.url);
      } else {
        const { data: publicUrlData } = supabase.storage.from("test").getPublicUrl(photo.name);
        console.log(`✅ Uploaded to bucket 'test': ${publicUrlData.publicUrl}`);
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    } catch (err) {
      console.warn(`Error processing photo ${photo.name}:`, err);
      uploadedUrls.push(photo.url);
    }
  }

  // 2. Link photos to recent entries
  console.log("📝 Querying recent entries to update with photos...");
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("id, vehicle_number")
    .order("id", { ascending: true })
    .limit(10);

  if (entriesError || !entries || entries.length === 0) {
    console.error("❌ Could not fetch entries to link photos:", entriesError);
    return;
  }

  // Assign photo groups:
  // Entry 1: 3 photos (Front, Scale, Cargo)
  // Entry 2: 2 photos (Front, Scale)
  // Entry 3: 4 photos (All 4)
  // Entry 4: 1 photo (Front)
  const assignments = [
    {
      id: entries[0]?.id,
      images: [uploadedUrls[0], uploadedUrls[1], uploadedUrls[2]].filter(Boolean),
    },
    { id: entries[1]?.id, images: [uploadedUrls[0], uploadedUrls[1]].filter(Boolean) },
    { id: entries[2]?.id, images: uploadedUrls.filter(Boolean) },
    { id: entries[3]?.id, images: [uploadedUrls[0]].filter(Boolean) },
  ];

  for (const item of assignments) {
    if (!item.id || item.images.length === 0) continue;
    const { error: updateError } = await supabase
      .from("entries")
      .update({ images: item.images })
      .eq("id", item.id);

    if (updateError) {
      console.error(`❌ Failed to update Entry #${item.id}:`, updateError.message);
    } else {
      console.log(`📸 Updated Entry #${item.id} with ${item.images.length} photo(s).`);
    }
  }

  console.log("🎉 Entry photos successfully seeded!");
}

seedPhotos();
