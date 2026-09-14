import { describe, expect, it, vi, beforeEach } from "vitest";
import { Role } from "@/lib/constants/enums";

vi.mock("@/db/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/helpers")>();
  return {
    ...actual,
    withAuth: <T>(handler: T) => handler,
  };
});

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();

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

import { POST, DELETE } from "./route";

type RawHandler = (
  request: Request,
  user: {
    sub: string;
    username: string;
    role: Role;
    factory_id: number;
  },
) => Promise<Response>;

const sampleUser = {
  sub: "1",
  username: "admin",
  role: Role.ADMIN,
  factory_id: 1,
};

describe("Storage Upload & Deletion API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/storage/upload", () => {
    it("rejects when no files are provided", async () => {
      const formData = new FormData();
      const req = new Request("http://localhost/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const handler = POST as unknown as RawHandler;
      const res = await handler(req, sampleUser);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("No image files provided for upload.");
    });

    it("rejects when file exceeds 10MB", async () => {
      const oversizedBlob = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: "image/jpeg" });
      const file = new File([oversizedBlob], "large.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("files", file);

      const req = new Request("http://localhost/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const handler = POST as unknown as RawHandler;
      const res = await handler(req, sampleUser);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("exceeds maximum allowed size of 10MB");
    });

    it("rejects invalid MIME type", async () => {
      const textBlob = new Blob(["hello world"], { type: "text/plain" });
      const file = new File([textBlob], "document.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("files", file);

      const req = new Request("http://localhost/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const handler = POST as unknown as RawHandler;
      const res = await handler(req, sampleUser);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Only image files are permitted");
    });

    it("uploads file successfully and returns public URL", async () => {
      const imageBlob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
      const file = new File([imageBlob], "photo.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("files", file);

      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl:
            "https://test.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/photo-123.jpg",
        },
      });

      const req = new Request("http://localhost/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const handler = POST as unknown as RawHandler;
      const res = await handler(req, sampleUser);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.urls).toEqual([
        "https://test.supabase.co/storage/v1/object/public/gluvok/f_1/weighments/photo-123.jpg",
      ]);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^f_1\/c_0\/weighments\/.+\.jpg$/),
        expect.any(Buffer),
        expect.anything(),
      );
    });
  });

  describe("DELETE /api/storage/upload", () => {
    it("deletes image paths belonging to the user's factory", async () => {
      mockRemove.mockResolvedValue({ error: null });

      const req = new Request("http://localhost/api/storage/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [
            "https://test.supabase.co/storage/v1/object/public/gluvok/f_1/c_3/weighments/photo1.jpg",
            "https://test.supabase.co/storage/v1/object/public/gluvok/f_2/c_1/weighments/other-factory.jpg", // should be ignored
          ],
        }),
      });

      const handler = DELETE as unknown as RawHandler;
      const res = await handler(req, sampleUser);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(1);
      expect(mockRemove).toHaveBeenCalledWith(["f_1/c_3/weighments/photo1.jpg"]);
    });
  });
});
