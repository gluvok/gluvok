/**
 * @file lib/services/image-processor.ts
 * @description Server-side image preprocessing utilities using sharp.
 * Provides per-camera crop configuration and buffer transformation before storage upload.
 *
 * NOTE: sharp relies on native libvips bindings and requires the Node.js Serverless runtime.
 * Do NOT import this file in any route that exports `runtime = 'edge'`.
 */

import sharp from "sharp";

/**
 * Crop configuration for a single camera, expressed as percentage insets
 * from each edge of the original image (0–100).
 */
export interface CameraCropConfig {
  camera: number;
  /** Percentage to crop from the top edge */
  top: number;
  /** Percentage to crop from the bottom edge */
  bottom: number;
  /** Percentage to crop from the left edge */
  left: number;
  /** Percentage to crop from the right edge */
  right: number;
}

/**
 * Default crop configurations derived from visual analysis of the two factory camera feeds.
 *   - Camera 1 (Front view): Removes wall/hose-reel left, parked vehicles right, sky top, ramp bottom.
 *   - Camera 2 (Rear view): Removes yard/parked-car left, boundary wall right, sky top, ramp bottom.
 */
export const DEFAULT_CAMERA_CROPS: CameraCropConfig[] = [
  { camera: 1, top: 5, bottom: 34, left: 37, right: 28 },
  { camera: 2, top: 12, bottom: 31, left: 20, right: 49 },
];

/**
 * Applies a percentage-based crop to an image buffer using sharp.
 *
 * @param buffer - Raw image buffer (JPEG, PNG, WebP, etc.)
 * @param crop   - Crop config with percentage insets per edge
 * @returns Cropped image buffer encoded as JPEG at quality 85
 */
export async function cropImageBuffer(buffer: Buffer, crop: CameraCropConfig): Promise<Buffer> {
  const { width: W, height: H } = await sharp(buffer).metadata();
  if (!W || !H) throw new Error("Unable to read image dimensions for cropping");

  const left = Math.round(W * (crop.left / 100));
  const top = Math.round(H * (crop.top / 100));
  const width = W - left - Math.round(W * (crop.right / 100));
  const height = H - top - Math.round(H * (crop.bottom / 100));

  if (width <= 0 || height <= 0) {
    throw new Error(
      `Invalid crop configuration: resulting dimensions ${width}x${height} for image ${W}x${H}`,
    );
  }

  return sharp(buffer).extract({ left, top, width, height }).jpeg({ quality: 85 }).toBuffer();
}

/**
 * Applies per-camera crop configs to an ordered array of image Files.
 * Files without a matching crop config are passed through untouched.
 *
 * @param files       - Ordered array [cam0, cam1, ...] of File objects
 * @param cropConfigs - Array of CameraCropConfig, indexed by camera number (1-based)
 * @returns Array of Buffers (cropped where config exists, raw otherwise)
 */
export async function preprocessCameraFiles(
  files: File[],
  cropConfigs: CameraCropConfig[],
): Promise<Buffer[]> {
  return Promise.all(
    files.map(async (file, index) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Camera numbers are 1-based: slot 0 → camera 1, slot 1 → camera 2, etc.
      const config = cropConfigs.find((c) => c.camera === index + 1);
      if (!config) return buffer;

      try {
        return await cropImageBuffer(buffer, config);
      } catch (err) {
        console.warn(
          `[image-processor] Crop failed for camera ${index + 1}, uploading original:`,
          err,
        );
        return buffer;
      }
    }),
  );
}
