import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn((_relation: string) => ({
  select: mockSelect,
}));

vi.mock("@/db", () => ({
  db: {
    from: (relation: string) => mockFrom(relation),
  },
}));

describe("Health API route handler (/api/health)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({
      limit: mockLimit,
    });
  });

  it("returns 200 with status ok when database query succeeds", async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: 1 }],
      error: null,
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({
      status: "ok",
      database: "connected",
    });
    expect(mockFrom).toHaveBeenCalledWith("factories");
    expect(mockSelect).toHaveBeenCalledWith("id");
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("returns 500 with error message when database query returns error", async () => {
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: "Database connection refused" },
    });

    const response = await GET();
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.status).toBe("error");
    expect(json.message).toBe("Database connection refused");
  });

  it("returns 500 with fallback message when database query throws unexpected error", async () => {
    mockLimit.mockRejectedValue(new Error("Network timeout"));

    const response = await GET();
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.status).toBe("error");
    expect(json.message).toBe("Network timeout");
  });
});
