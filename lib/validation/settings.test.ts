import { describe, it, expect } from "vitest";
import { editSettingsSchema } from "./settings";

describe("editSettingsSchema", () => {
  it("accepts valid factory name and boolean check_center_on_merge", () => {
    const res = editSettingsSchema.safeParse({
      name: "Acme Sugars",
      check_center_on_merge: true,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Acme Sugars");
      expect(res.data.check_center_on_merge).toBe(true);
    }
  });

  it("accepts only check_center_on_merge toggle", () => {
    const res = editSettingsSchema.safeParse({
      check_center_on_merge: false,
    });
    expect(res.success).toBe(true);
  });

  it("accepts only name", () => {
    const res = editSettingsSchema.safeParse({
      name: "Global Agro Processing",
    });
    expect(res.success).toBe(true);
  });

  it("rejects empty factory name", () => {
    const res = editSettingsSchema.safeParse({
      name: "   ",
    });
    expect(res.success).toBe(false);
  });

  it("rejects unknown properties due to strict mode", () => {
    const res = editSettingsSchema.safeParse({
      name: "Acme",
      unknown_field: 123,
    });
    expect(res.success).toBe(false);
  });
});
