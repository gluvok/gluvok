import { describe, expect, it } from "vitest";
import { formatDateTime } from "./index";

describe("formatDateTime (IST Timezone Conversion)", () => {
  it("converts UTC ISO timestamp to Indian Standard Time (IST - Asia/Kolkata)", () => {
    // 2026-08-27T20:54:16Z + 5:30 -> 2026-08-28 02:24 AM IST
    const result = formatDateTime("2026-08-27T20:54:16.000Z");
    expect(result).toBe("28 Aug 2026, 02:24 AM");
  });

  it("handles midday timestamps in IST correctly", () => {
    // 2026-08-28T09:00:00Z + 5:30 -> 2026-08-28 02:30 PM IST
    const result = formatDateTime("2026-08-28T09:00:00.000Z");
    expect(result).toBe("28 Aug 2026, 02:30 PM");
  });

  it("handles Date objects directly", () => {
    const date = new Date("2026-01-15T04:15:00.000Z"); // -> 15 Jan 2026, 09:45 AM IST
    const result = formatDateTime(date);
    expect(result).toBe("15 Jan 2026, 09:45 AM");
  });

  it("returns '-' for empty or null dates", () => {
    expect(formatDateTime("")).toBe("-");
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
  });

  it("returns original string for invalid date formats", () => {
    expect(formatDateTime("invalid-date-string")).toBe("invalid-date-string");
  });
});
