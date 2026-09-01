import { describe, expect, it } from "vitest";
import { ProjectSlug } from "@/lib/constants/enums";
import { ENTITY_ADD_SCHEMAS, ENTITY_EDIT_SCHEMAS } from "./registry";

describe("validation registry", () => {
  it("registers add schemas for all creatable project entities", () => {
    const creatableSlugs = [
      ProjectSlug.CENTERS,
      ProjectSlug.RATES,
      ProjectSlug.CUSTOMERS,
      ProjectSlug.ENTRIES,
      ProjectSlug.USERS,
    ] as const;

    for (const slug of creatableSlugs) {
      expect(ENTITY_ADD_SCHEMAS[slug]).toBeDefined();
    }

    // Weighments and Commodities are not manually creatable
    expect((ENTITY_ADD_SCHEMAS as Record<string, unknown>)[ProjectSlug.WEIGHMENTS]).toBeUndefined();
    expect((ENTITY_ADD_SCHEMAS as Record<string, unknown>)[ProjectSlug.COMMODITIES]).toBeUndefined();
  });

  it("registers edit schemas for all editable project entities", () => {
    const editableSlugs = [
      ProjectSlug.CENTERS,
      ProjectSlug.RATES,
      ProjectSlug.CUSTOMERS,
      ProjectSlug.ENTRIES,
      ProjectSlug.WEIGHMENTS,
      ProjectSlug.USERS,
    ] as const;

    for (const slug of editableSlugs) {
      expect(ENTITY_EDIT_SCHEMAS[slug]).toBeDefined();
    }

    // Commodities are not editable
    expect((ENTITY_EDIT_SCHEMAS as Record<string, unknown>)[ProjectSlug.COMMODITIES]).toBeUndefined();
  });
});
