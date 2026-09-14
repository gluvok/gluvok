import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockUpload, mockGetPublicUrl } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}));

import { uploadBase64ImagesToStorage } from "./storage";

describe("uploadBase64ImagesToStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when given empty or null images", async () => {
    const res = await uploadBase64ImagesToStorage([], 1, 1);
    expect(res).toEqual([]);
  });

  it("leaves existing public web URLs untouched", async () => {
    const urls = [
      "https://example.com/images/capture1.jpg",
      "http://storage.googleapis.com/test.png",
    ];
    const res = await uploadBase64ImagesToStorage(urls, 1, 1);
    expect(res).toEqual(urls);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("decodes base64 data URIs and uploads to Supabase storage", async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/test.jpg",
      },
    });

    const base64Img =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

    const res = await uploadBase64ImagesToStorage([base64Img], 1, 5);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^f_1\/c_5\/weighments\/.+\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      }),
    );
    expect(res).toEqual([
      "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/test.jpg",
    ]);
  });

  it("supports PNG base64 images and extracts png extension", async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_2/weighments/test.png",
      },
    });

    const base64Png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await uploadBase64ImagesToStorage([base64Png], 2, 3);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^f_2\/c_3\/weighments\/.+\.png$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/png",
      }),
    );
    expect(res).toEqual([
      "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_2/weighments/test.png",
    ]);
  });

  it("throws error when centerId is missing or invalid", async () => {
    const base64Img = "data:image/jpeg;base64,aGVsbG8=";
    await expect(uploadBase64ImagesToStorage([base64Img], 1, 0)).rejects.toThrow(
      "Valid centerId is required for image uploads",
    );
    await expect(uploadBase64ImagesToStorage([base64Img], 1, -1)).rejects.toThrow(
      "Valid centerId is required for image uploads",
    );
    await expect(
      uploadBase64ImagesToStorage([base64Img], 1, undefined as unknown as number),
    ).rejects.toThrow("Valid centerId is required for image uploads");
  });

  it("throws error when factoryId is missing or invalid", async () => {
    const base64Img = "data:image/jpeg;base64,aGVsbG8=";
    await expect(uploadBase64ImagesToStorage([base64Img], 0, 1)).rejects.toThrow(
      "Valid factoryId is required for image uploads",
    );
    await expect(uploadBase64ImagesToStorage([base64Img], -1, 1)).rejects.toThrow(
      "Valid factoryId is required for image uploads",
    );
    await expect(
      uploadBase64ImagesToStorage([base64Img], undefined as unknown as number, 1),
    ).rejects.toThrow("Valid factoryId is required for image uploads");
  });

  it("handles storage upload errors gracefully by returning original string", async () => {
    mockUpload.mockResolvedValue({ error: new Error("Storage quota exceeded") });

    const base64Img = "data:image/jpeg;base64,aGVsbG8=";
    const res = await uploadBase64ImagesToStorage([base64Img], 1, 1);

    expect(res).toEqual([base64Img]);
  });
});
