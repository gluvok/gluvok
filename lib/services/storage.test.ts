import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockUpload, mockGetPublicUrl, mockRemove } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  },
}));

import { uploadBase64ImagesToStorage, uploadFilesToStorage, deleteStorageImages } from "./storage";

describe("uploadBase64ImagesToStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when given empty or null images", async () => {
    const res = await uploadBase64ImagesToStorage([], 1);
    expect(res).toEqual([]);
  });

  it("leaves existing public web URLs untouched", async () => {
    const urls = [
      "https://example.com/images/capture1.jpg",
      "http://storage.googleapis.com/test.png",
    ];
    const res = await uploadBase64ImagesToStorage(urls, 1);
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

    const res = await uploadBase64ImagesToStorage([base64Img], 1);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^f_1\/weighments\/.+\.jpg$/),
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

    const res = await uploadBase64ImagesToStorage([base64Png], 2);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^f_2\/weighments\/.+\.png$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/png",
      }),
    );
    expect(res).toEqual([
      "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_2/weighments/test.png",
    ]);
  });

  it("throws error when factoryId is missing or invalid", async () => {
    const base64Img = "data:image/jpeg;base64,aGVsbG8=";
    await expect(uploadBase64ImagesToStorage([base64Img], 0)).rejects.toThrow(
      "Valid factoryId is required for image uploads",
    );
    await expect(uploadBase64ImagesToStorage([base64Img], -1)).rejects.toThrow(
      "Valid factoryId is required for image uploads",
    );
    await expect(
      uploadBase64ImagesToStorage([base64Img], undefined as unknown as number),
    ).rejects.toThrow("Valid factoryId is required for image uploads");
  });

  it("handles storage upload errors gracefully by returning original string", async () => {
    mockUpload.mockResolvedValue({ error: new Error("Storage quota exceeded") });

    const base64Img = "data:image/jpeg;base64,aGVsbG8=";
    const res = await uploadBase64ImagesToStorage([base64Img], 1);

    expect(res).toEqual([base64Img]);
  });
});

describe("uploadFilesToStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when given empty files", async () => {
    const res = await uploadFilesToStorage([], 1);
    expect(res).toEqual([]);
  });

  it("throws error when file exceeds 10MB", async () => {
    const hugeFile = {
      name: "huge.jpg",
      size: 11 * 1024 * 1024,
      type: "image/jpeg",
      arrayBuffer: vi.fn(),
    } as unknown as File;

    await expect(uploadFilesToStorage([hugeFile], 1)).rejects.toThrow(
      'File "huge.jpg" exceeds maximum allowed size of 10MB',
    );
  });

  it("throws error for invalid image MIME type", async () => {
    const badFile = {
      name: "script.sh",
      size: 100,
      type: "application/x-sh",
      arrayBuffer: vi.fn(),
    } as unknown as File;

    await expect(uploadFilesToStorage([badFile], 1)).rejects.toThrow(
      'Invalid image file type "application/x-sh"',
    );
  });

  it("successfully uploads valid File and returns public URL", async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/photo.jpg",
      },
    });

    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const res = await uploadFilesToStorage([file], 1);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^f_1\/weighments\/.+\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/jpeg",
        cacheControl: "3600",
      }),
    );
    expect(res).toEqual([
      "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/photo.jpg",
    ]);
  });
});

describe("deleteStorageImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when given empty array", async () => {
    const res = await deleteStorageImages([]);
    expect(res).toBe(0);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("deletes relative paths and public URLs scoped to factory", async () => {
    mockRemove.mockResolvedValue({ error: null });

    const urls = [
      "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/photo1.jpg",
      "https://ivatsbrhsdwkrkiecrvg.supabase.co/storage/v1/object/public/gluvok/f_2/weighments/photo2.jpg", // different factory
    ];

    const count = await deleteStorageImages(urls, 1);
    expect(count).toBe(1);
    expect(mockRemove).toHaveBeenCalledWith(["f_1/weighments/photo1.jpg"]);
  });
});
