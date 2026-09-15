"use client";

/**
 * @file components/form/image/upload.tsx
 * @description Upload component for handling drag-and-drop local image selection,
 * secure server-side storage uploading/deletions, and caching.
 */

import { useState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Dropzone, DropzoneEmptyState } from "@/components/kibo-ui/dropzone";
import { ImagePreviewCarousel } from "@/components/form/image/preview-carousel";

const MAX_IMAGE_FILES = 10;
const MAX_IMAGE_SIZE = 1024 * 1024 * 10; // 10MB

interface ImageUploadProps {
  id?: string;
  value?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

/**
 * pendingImageUploads
 * In-memory registry mapping generated object URLs (blob URL) to raw browser File objects,
 * storing them until form submission.
 */
const pendingImageUploads = new Map<string, File>();

export function getPendingImageFile(blobUrl: string): File | undefined {
  return pendingImageUploads.get(blobUrl);
}

export function releasePendingImage(blobUrl: string): void {
  pendingImageUploads.delete(blobUrl);
  try {
    URL.revokeObjectURL(blobUrl);
  } catch {}
}

/**
 * ImageUpload Component
 * Dropzone component that registers dropped local files, maps object URLs,
 * and passes the blob URL list up to the parent form.
 */
export function ImageUpload({ value = [], onChange, disabled }: ImageUploadProps) {
  const [fileNameMap, setFileNameMap] = useState<Record<string, string>>({});

  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      // Clean up object URLs on unmount to prevent memory leaks
      valueRef.current.forEach((img) => {
        if (img.startsWith("blob:")) {
          pendingImageUploads.delete(img);
          URL.revokeObjectURL(img);
        }
      });
    };
  }, []);

  const handleDrop = (acceptedFiles: File[]) => {
    try {
      const newBlobUrls = acceptedFiles.map((file) => {
        const blobUrl = URL.createObjectURL(file);
        pendingImageUploads.set(blobUrl, file);
        setFileNameMap((prev) => ({ ...prev, [blobUrl]: file.name }));
        return blobUrl;
      });

      onChange([...value, ...newBlobUrls]);
      toast.success(`Selected ${acceptedFiles.length} image(s) for upload`);
    } catch (err: unknown) {
      console.error("Error reading files:", err);
      toast.error("Failed to read files");
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const urlToDelete = value[indexToRemove];
    onChange(value.filter((_, i) => i !== indexToRemove));

    if (urlToDelete.startsWith("blob:")) {
      pendingImageUploads.delete(urlToDelete);
      URL.revokeObjectURL(urlToDelete);
    }
  };

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <ImagePreviewCarousel
          images={value}
          fileNames={value.map((v) => fileNameMap[v])}
          disabled={disabled}
          onRemove={handleRemove}
        />
      )}

      {!disabled && (
        <Dropzone
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
          maxFiles={MAX_IMAGE_FILES}
          maxSize={MAX_IMAGE_SIZE}
          onDrop={handleDrop}
          onError={(err) => {
            console.error(err);
            toast.error(err.message || "File upload failed");
          }}
          className="border-dashed border-2 border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/10 transition-all py-6 rounded-xl"
        >
          <DropzoneEmptyState className="py-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary mb-1">
              <Upload className="h-4 w-4" />
            </div>
            <p className="font-semibold text-xs text-foreground">Upload weighment images</p>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Drag &amp; drop or click to browse (Max 10MB each)
            </p>
          </DropzoneEmptyState>
        </Dropzone>
      )}
    </div>
  );
}
