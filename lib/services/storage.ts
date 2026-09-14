/**
 * @file lib/services/storage.ts
 * @description Server-side utility to decode Base64 images and upload them to Supabase Storage bucket.
 */

import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET_NAME = "gluvok";
const CACHE_CONTROL = "3600";
const UPLOAD_PATH_FOLDER = "weighments";

/**
 * Uploads an array of base64 image strings to the Supabase Storage bucket.
 * Non-base64 images (e.g. existing https URLs) are returned untouched.
 *
 * @param images Array of image strings (data URIs, raw base64, or existing URLs)
 * @param factoryId Active factory ID for directory partitioning
 * @returns Array of public URLs for all uploaded images
 */
export async function uploadBase64ImagesToStorage(
  images: string[],
  factoryId: number | string,
): Promise<string[]> {
  if (!images || images.length === 0) return [];

  const parsedFactoryId = Number(factoryId);
  if (!Number.isSafeInteger(parsedFactoryId) || parsedFactoryId <= 0) {
    throw new Error("Valid factoryId is required for image uploads");
  }

  const factoryPrefix = String(parsedFactoryId);

  return Promise.all(
    images.map(async (img) => {
      if (!img || typeof img !== "string") return "";

      // Check if image is already a public web URL
      if (img.startsWith("http://") || img.startsWith("https://")) {
        return img;
      }

      // Check for base64 data URI or raw base64
      let mimeType = "image/jpeg";
      let ext = "jpg";
      let base64Content = img;

      if (img.startsWith("data:image/")) {
        const matches = img.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          const rawExt = mimeType.split("/")[1] || "jpg";
          ext = rawExt === "jpeg" ? "jpg" : rawExt;
          base64Content = matches[2];
        }
      }

      try {
        const buffer = Buffer.from(base64Content, "base64");
        const uniqueId = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
        const filePath = `f_${factoryPrefix}/${UPLOAD_PATH_FOLDER}/${uniqueId}.${ext}`;

        const { error } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .upload(filePath, buffer, {
            contentType: mimeType,
            cacheControl: CACHE_CONTROL,
            upsert: false,
          });

        if (error) {
          console.error("Failed to upload base64 image to Supabase storage:", error);
          return img;
        }

        const { data } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(filePath);
        return data?.publicUrl || img;
      } catch (err) {
        console.error("Error processing base64 image upload:", err);
        return img;
      }
    }),
  );
}
