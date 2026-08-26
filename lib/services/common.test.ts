import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { deleteRows, fetchEntityPaginatedFromApi } from "./common";
import { ProjectSlug, Unit } from "@/lib/constants/enums";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}));

describe("fetchEntityPaginatedFromApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards sort params to API", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        data: [{ id: 1, name: "Alpha" }],
        pagination: { total: 1 },
      },
    });

    const result = await fetchEntityPaginatedFromApi(ProjectSlug.CENTERS, {
      page: 1,
      pageSize: 10,
      search: "al",
      sortColumn: "name",
      sortDesc: true,
      filters: { unit: Unit.KG },
    });

    expect(axios.get).toHaveBeenCalledWith("/api/centers", {
      params: {
        page: 2,
        limit: 10,
        search: "al",
        sort_column: "name",
        sort_desc: true,
        unit: Unit.KG,
      },
    });

    expect(result).toEqual({
      data: [{ id: 1, name: "Alpha" }],
      count: 1,
    });
  });
});

describe("deleteRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends one collection DELETE request containing all selected IDs", async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: { deleted_count: 3 } });

    await expect(deleteRows(ProjectSlug.CENTERS, [1, 2, 3])).resolves.toBe(3);

    expect(axios.delete).toHaveBeenCalledWith("/api/centers", {
      data: { ids: [1, 2, 3] },
    });
  });
});
