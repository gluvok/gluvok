import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { resolveTenant } from "./index"
import { TenantMode } from "@/lib/constants/enums"

describe("resolveTenant", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.DATABASE_URL = "postgresql://localhost:5432/shared_db"
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should return SHARED mode when workspace is null", () => {
    const result = resolveTenant(null)
    expect(result.mode).toBe(TenantMode.SHARED)
    expect(result.workspace).toBeNull()
    expect(result.dbUrl).toBe("postgresql://localhost:5432/shared_db")
  })

  it("should return DEDICATED mode when WORKSPACE_<NAME> env var is present", () => {
    process.env.WORKSPACE_NEON = "postgresql://neon-db-url:5432/neondb"
    const result = resolveTenant("neon")
    expect(result.mode).toBe(TenantMode.DEDICATED)
    expect(result.workspace).toBe("neon")
    expect(result.dbUrl).toBe("postgresql://neon-db-url:5432/neondb")
  })

  it("should handle hyphenated workspace names in env var lookup", () => {
    process.env.WORKSPACE_TEST_CLIENT = "postgresql://test-client-url:5432/db"
    const result = resolveTenant("test-client")
    expect(result.mode).toBe(TenantMode.DEDICATED)
    expect(result.workspace).toBe("test-client")
    expect(result.dbUrl).toBe("postgresql://test-client-url:5432/db")
  })

  it("should fall back to SHARED mode when workspace env var is not found", () => {
    const result = resolveTenant("unknown-client")
    expect(result.mode).toBe(TenantMode.SHARED)
    expect(result.workspace).toBeNull()
    expect(result.dbUrl).toBe("postgresql://localhost:5432/shared_db")
  })
})
