import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("Password utilities (Argon2id)", () => {
  it("hashes a password and produces a valid argon2id hash", async () => {
    const hash = await hashPassword("super-secret-password-123");
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("produces unique hashes for the same password due to random salting", async () => {
    const hash1 = await hashPassword("same-password");
    const hash2 = await hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });

  it("verifies matching password correctly", async () => {
    const password = "my-secure-password";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("rejects non-matching password", async () => {
    const password = "my-secure-password";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword("wrong-password", hash);
    expect(isValid).toBe(false);
  });

  it("safely returns false without throwing on malformed or corrupted hash", async () => {
    const isValid = await verifyPassword("any-password", "not-a-valid-argon2-hash");
    expect(isValid).toBe(false);
  });
});
