/**
 * @file app/api/storage/upload/route.ts
 * @description Dedicated server-side API route for secure authenticated image uploads and deletions.
 */

import { NextResponse } from "next/server";
import { withAuth, apiError, StatusCodes } from "@/db/helpers";
import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET_NAME = "gluvok";
const CACHE_CONTROL = "3600";
const UPLOAD_PATH_FOLDER = "weighments";
const PUBLIC_URL_INDICATOR = "/public/gluvok/";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/bmp",
]);

export const POST = withAuth(async (req, user) => {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;

    const allFiles: File[] = [];
    if (files && files.length > 0) {
      allFiles.push(...files);
    } else if (singleFile) {
      allFiles.push(singleFile);
    }

    if (allFiles.length === 0) {
      return apiError("No image files provided for upload.", StatusCodes.BAD_REQUEST);
    }

    const factoryPrefix = String(user.factory_id ?? "default");
    const uploadedUrls: string[] = [];

    for (const file of allFiles) {
      if (file.size > MAX_IMAGE_SIZE) {
        return apiError(
          `File "${file.name}" exceeds maximum allowed size of 10MB.`,
          StatusCodes.BAD_REQUEST,
        );
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
        return apiError(
          `Invalid file type "${file.type}". Only image files are permitted.`,
          StatusCodes.BAD_REQUEST,
        );
      }

      const fileExt = file.name.split(".").pop() || "jpg";
      const uniqueId = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
      const filePath = `f_${factoryPrefix}/${UPLOAD_PATH_FOLDER}/${uniqueId}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type || "image/jpeg",
          cacheControl: CACHE_CONTROL,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        return apiError("Failed to upload image to storage.", StatusCodes.INTERNAL_SERVER_ERROR);
      }

      const { data } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(filePath);
      if (data?.publicUrl) {
        uploadedUrls.push(data.publicUrl);
      }
    }

    return NextResponse.json(
      {
        data: {
          urls: uploadedUrls,
        },
      },
      { status: StatusCodes.CREATED },
    );
  } catch (err: unknown) {
    console.error("Storage upload handler error:", err);
    const msg = err instanceof Error ? err.message : "Failed to process image upload";
    return apiError(msg, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

export const DELETE = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const urls = (body.urls || []) as string[];
    const paths = (body.paths || []) as string[];

    const factoryPrefix = `f_${user.factory_id ?? "default"}/`;
    const targetPaths: string[] = [];

    for (const url of urls) {
      if (typeof url === "string" && url.includes(PUBLIC_URL_INDICATOR)) {
        const extracted = url.split(PUBLIC_URL_INDICATOR)[1];
        if (extracted && extracted.startsWith(factoryPrefix)) {
          targetPaths.push(extracted);
        }
      }
    }

    for (const p of paths) {
      if (typeof p === "string" && p.startsWith(factoryPrefix)) {
        targetPaths.push(p);
      }
    }

    if (targetPaths.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error: removeError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .remove(targetPaths);

    if (removeError) {
      console.error("Supabase storage deletion error:", removeError);
      return apiError("Failed to delete images from storage.", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return NextResponse.json({ success: true, count: targetPaths.length });
  } catch (err: unknown) {
    console.error("Storage deletion handler error:", err);
    const msg = err instanceof Error ? err.message : "Failed to process image deletion";
    return apiError(msg, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});
